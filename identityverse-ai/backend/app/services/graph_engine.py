"""
Identity Graph + Blast Radius -- built on NetworkX.

Graph shape: User -> Role (per platform) -> Permission -> Resource
This single graph powers both the Identity Graph visualization page and the
Blast Radius calculation ("what's reachable if this identity is compromised").
"""
import networkx as nx

from app import db

SENSITIVE_RESOURCES = {
    "S3-customer-data", "Salesforce-leads", "HR-payroll-db", "AWS-billing",
}


def build_graph_for_identity(identity: dict) -> nx.DiGraph:
    G = nx.DiGraph()
    uid = identity["identity_id"]
    G.add_node(uid, type="user", label=identity["full_name"])

    role_mappings = db.role_mappings.find(user_id=uid)

    for acct in identity["platform_accounts"]:
        role_node = f"{acct['platform']}:{acct['role']}"
        G.add_node(role_node, type="role", label=acct["role"], platform=acct["platform"])
        G.add_edge(uid, role_node, relation="HAS_ROLE")

        mapping = next((m for m in role_mappings if m["platform"] == acct["platform"]), None)
        if mapping:
            for perm in mapping["inherited_permissions"]:
                perm_node = f"{acct['platform']}:perm:{perm}"
                G.add_node(perm_node, type="permission", label=perm)
                G.add_edge(role_node, perm_node, relation="GRANTS")

                # Map permissions to concrete resources for blast-radius purposes
                resource = _permission_to_resource(acct["platform"], perm)
                if resource:
                    is_sensitive = resource in SENSITIVE_RESOURCES
                    G.add_node(resource, type="resource", label=resource, sensitive=is_sensitive)
                    G.add_edge(perm_node, resource, relation="ACCESSES")

    return G


def _permission_to_resource(platform: str, permission: str) -> str | None:
    mapping = {
        ("AWS", "export"): "S3-customer-data",
        ("AWS", "billing"): "AWS-billing",
        ("AWS", "admin"): "S3-customer-data",
        ("Salesforce", "read"): "Salesforce-leads",
        ("Salesforce", "export"): "Salesforce-leads",
        ("AD", "admin"): "AD-domain-controller",
        ("Okta", "admin"): "Okta-admin-console",
    }
    return mapping.get((platform, permission))


def graph_to_json(G: nx.DiGraph) -> dict:
    nodes = [{"id": n, **data} for n, data in G.nodes(data=True)]
    edges = [{"source": u, "target": v, **data} for u, v, data in G.edges(data=True)]
    return {"nodes": nodes, "edges": edges}


def calculate_blast_radius(identity: dict) -> dict:
    G = build_graph_for_identity(identity)
    uid = identity["identity_id"]

    reachable = nx.descendants(G, uid) if uid in G else set()
    reachable_resources = [
        n for n in reachable if G.nodes[n].get("type") == "resource"
    ]
    sensitive_hit = any(G.nodes[n].get("sensitive") for n in reachable_resources)
    platforms_touched = set(
        G.nodes[n].get("platform") for n in reachable if G.nodes[n].get("type") == "role"
    )

    systems_impacted = len(platforms_touched)
    critical_resources = len(reachable_resources)

    if sensitive_hit or systems_impacted >= 3:
        impact_level = "CRITICAL"
    elif systems_impacted == 2:
        impact_level = "HIGH"
    elif systems_impacted == 1:
        impact_level = "MEDIUM"
    else:
        impact_level = "LOW"

    return {
        "identity_id": uid,
        "systems_impacted": systems_impacted,
        "critical_resources": critical_resources,
        "customer_data_exposed": sensitive_hit,
        "impact_level": impact_level,
        "reachable_resources": reachable_resources,
    }
