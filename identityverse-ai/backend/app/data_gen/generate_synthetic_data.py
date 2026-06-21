"""
Synthetic enterprise identity data generator.

Generates 500 users across AD/AWS/Okta/Salesforce with deliberately baked-in
anomalies (orphan accounts, cross-platform admins, dormant admins, token
abuse, privilege escalation, service accounts w/o owners, stale credentials)
at the percentages from the problem statement, PLUS ground-truth labels so
you can later report precision/recall like the self-eval script wants.

Run directly:  python -m app.data_gen.generate_synthetic_data
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

from faker import Faker

from app import config, db

fake = Faker()
Faker.seed(config.RANDOM_SEED)
random.seed(config.RANDOM_SEED)

DEPARTMENTS = ["Finance", "HR", "Engineering", "Marketing", "Operations", "Security"]
PLATFORMS = ["AD", "AWS", "Okta", "Salesforce"]
ROLES_BY_PLATFORM = {
    "AD": ["Read Only", "Standard User", "Power User", "Domain Admin"],
    "AWS": ["ReadOnlyAccess", "PowerUserAccess", "AdministratorAccess"],
    "Okta": ["User", "App Admin", "Super Admin"],
    "Salesforce": ["Standard User", "Marketing User", "System Administrator"],
}
ADMIN_ROLES = {"Domain Admin", "AdministratorAccess", "Super Admin", "System Administrator"}

# Anomaly mix from the problem statement
ANOMALY_WEIGHTS = {
    "ORPHAN_ACCOUNT": 0.12,
    "CROSS_PLATFORM_ADMIN": 0.10,
    "DORMANT_ADMIN": 0.08,
    "TOKEN_ABUSE": 0.05,
    "PRIVILEGE_ESCALATION": 0.06,
    "SERVICE_ACCOUNT_NO_OWNER": 0.04,
    "STALE_CREDENTIALS": 0.05,
    "NORMAL": 0.50,
}


def _username_variants(first: str, last: str) -> dict:
    """Same human, deliberately different usernames per platform --
    this is exactly what the Identity Resolver has to solve."""
    return {
        "AD": f"{first.lower()}.{last.lower()}",
        "AWS": f"{first.lower()}_{last.lower()}",
        "Okta": f"{first.lower()}@{fake.domain_name()}",
        "Salesforce": f"{first[0].lower()}{last.lower()}",
    }


def _pick_anomaly() -> str:
    r = random.random()
    cumulative = 0.0
    for label, weight in ANOMALY_WEIGHTS.items():
        cumulative += weight
        if r <= cumulative:
            return label
    return "NORMAL"


def generate():
    db.users.truncate()
    db.identity_snapshots.truncate()
    db.audit_logs.truncate()
    db.role_mappings.truncate()
    db.offboarding_records.truncate()
    db.unified_identities.truncate()

    users = []
    snapshots = []
    role_mappings = []
    offboarding_records = []
    labels = []  # ground truth for precision/recall self-eval

    now = datetime.now(timezone.utc)

    for _ in range(config.NUM_USERS):
        user_id = str(uuid.uuid4())
        first, last = fake.first_name(), fake.last_name()
        full_name = f"{first} {last}"
        dept = random.choice(DEPARTMENTS)
        manager = fake.name()
        anomaly_type = _pick_anomaly()
        usernames = _username_variants(first, last)

        users.append({
            "user_id": user_id,
            "full_name": full_name,
            "department": dept,
            "manager": manager,
            "anomaly_type": anomaly_type,  # ground truth, not exposed via API
        })

        # Decide which platforms this user has accounts on (everyone has AD;
        # spread across others to create realistic cross-platform sprawl)
        user_platforms = ["AD"] + random.sample(
            [p for p in PLATFORMS if p != "AD"], k=random.randint(1, 3)
        )

        is_risky = anomaly_type != "NORMAL"

        for platform in user_platforms:
            status = "Active"
            role = random.choice(ROLES_BY_PLATFORM[platform])
            last_login_days_ago = random.randint(0, 30)

            if anomaly_type == "ORPHAN_ACCOUNT":
                # Disabled in AD, but still active elsewhere
                if platform == "AD":
                    status = "Disabled"
                    last_login_days_ago = random.randint(60, 200)
                else:
                    status = "Active"
                    last_login_days_ago = random.randint(0, 10)

            elif anomaly_type == "CROSS_PLATFORM_ADMIN":
                if platform in ("AD", "AWS", "Okta"):
                    role = ADMIN_ROLES_FOR(platform)

            elif anomaly_type == "DORMANT_ADMIN":
                role = ADMIN_ROLES_FOR(platform) if random.random() < 0.6 else role
                if role in ADMIN_ROLES:
                    last_login_days_ago = random.randint(91, 180)

            elif anomaly_type == "PRIVILEGE_ESCALATION":
                role = ADMIN_ROLES_FOR(platform) if random.random() < 0.5 else role

            elif anomaly_type == "SERVICE_ACCOUNT_NO_OWNER":
                manager = None

            last_login = (now - timedelta(days=last_login_days_ago)).isoformat()
            token_age_days = (
                random.randint(366, 720)
                if anomaly_type in ("TOKEN_ABUSE", "STALE_CREDENTIALS")
                else random.randint(1, 200)
            )

            snapshots.append({
                "snapshot_id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": platform,
                "username": usernames[platform],
                "role": role,
                "last_login": last_login,
                "status": status,
                "department": dept,
                "manager": manager,
                "token_age_days": token_age_days,
                "is_admin": role in ADMIN_ROLES,
            })

            role_mappings.append({
                "mapping_id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": platform,
                "role": role,
                "nested_group": f"{platform}-{dept}-Group",
                "inherited_permissions": random.sample(
                    ["read", "write", "delete", "admin", "billing", "export"],
                    k=random.randint(1, 3),
                ),
            })

        labels.append({
            "user_id": user_id,
            "full_name": full_name,
            "is_risky": is_risky,
            "anomaly_type": anomaly_type,
        })

        # Offboarding records for ~20% of users (creates the offboarding gap scenario)
        if random.random() < 0.2:
            term_date = now - timedelta(days=random.randint(10, 300))
            ad_disabled = True
            other_disabled = anomaly_type != "ORPHAN_ACCOUNT"  # orphans = gap on purpose
            offboarding_records.append({
                "record_id": str(uuid.uuid4()),
                "user_id": user_id,
                "termination_date": term_date.isoformat(),
                "ad_disabled": ad_disabled,
                "other_platforms_disabled": other_disabled,
            })

    # --- Audit logs: 10,000 events referencing real users/platforms ---
    actions = ["LOGIN", "ROLE_CHANGE", "RESOURCE_ACCESS", "PERMISSION_GRANT", "API_CALL", "LOGOUT"]
    resources = ["S3-customer-data", "Salesforce-leads", "AD-domain-controller",
                 "AWS-billing", "Okta-admin-console", "HR-payroll-db"]
    audit_logs = []
    user_ids = [u["user_id"] for u in users]
    for _ in range(config.NUM_AUDIT_LOGS):
        uid = random.choice(user_ids)
        ts = now - timedelta(days=random.randint(0, 365), hours=random.randint(0, 23))
        audit_logs.append({
            "log_id": str(uuid.uuid4()),
            "timestamp": ts.isoformat(),
            "user_id": uid,
            "platform": random.choice(PLATFORMS),
            "action": random.choice(actions),
            "ip_address": fake.ipv4(),
            "resource": random.choice(resources),
            "result": random.choices(["SUCCESS", "FAILURE"], weights=[0.9, 0.1])[0],
        })

    db.users.insert_many(users)
    db.identity_snapshots.insert_many(snapshots)
    db.role_mappings.insert_many(role_mappings)
    db.offboarding_records.insert_many(offboarding_records)
    db.audit_logs.insert_many(audit_logs)
    db.flush()

    # Ground truth labels written alongside the DB for the self-eval script
    import json
    with open(config.DATA_DIR / "identity_risk_labels.json", "w") as f:
        json.dump(labels, f, indent=2)

    print(f"Generated {len(users)} users, {len(snapshots)} identity snapshots, "
          f"{len(audit_logs)} audit logs, {len(role_mappings)} role mappings, "
          f"{len(offboarding_records)} offboarding records.")
    print(f"Ground truth labels written to {config.DATA_DIR / 'identity_risk_labels.json'}")


def ADMIN_ROLES_FOR(platform: str) -> str:
    return {
        "AD": "Domain Admin",
        "AWS": "AdministratorAccess",
        "Okta": "Super Admin",
        "Salesforce": "System Administrator",
    }[platform]


if __name__ == "__main__":
    generate()
