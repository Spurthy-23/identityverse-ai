"""
AI client -- Groq (llama-3.3-70b-versatile), used for the AI CISO
remediation engine, the Identity Risk Copilot, and Evidence Timeline
narration.

Same safety pattern as before: every call is wrapped so a missing API key,
quota error, or network hiccup never crashes a request -- it falls back to
a templated (but still genuinely useful) response. The `source` field on
remediation responses tells you which path was used.
"""
from groq import Groq

from app import config

_client = None


def _get_client():
    global _client
    if not config.GROQ_API_KEY:
        return None
    if _client is None:
        _client = Groq(api_key=config.GROQ_API_KEY)
    return _client


def _fallback_remediation(identity: dict, risk: dict) -> dict:
    """Deterministic template used when Groq is unavailable. Still
    genuinely actionable, not a placeholder -- built from the same risk
    factors the AI prompt would have used."""
    steps = []
    if risk.get("is_cross_platform_admin"):
        steps.append("Review and reduce admin scope to a single platform unless explicitly justified by role.")
    if risk.get("is_dormant_admin"):
        steps.append("Suspend the dormant admin account and require re-verification before reactivation.")
    if risk.get("has_old_token"):
        steps.append("Force-rotate all credentials/API tokens older than 365 days.")
    if risk.get("is_orphan"):
        steps.append("Immediately disable the active account(s) on platforms where this user was already offboarded in AD.")
    if not steps:
        steps.append("No immediate action required; continue routine access review cadence.")

    return {
        "summary": f"{identity['full_name']} has a risk score of {risk['risk_score']} "
                    f"({risk['risk_band']}), driven by: {'; '.join(risk['risk_factors'])}.",
        "business_impact": "Elevated or orphaned privileged access increases the chance "
                            "of undetected lateral movement or data exposure if this "
                            "identity's credentials are compromised.",
        "remediation_steps": steps,
        "source": "fallback_template",
    }


def get_remediation(identity: dict, risk: dict) -> dict:
    client = _get_client()
    if client is None:
        return _fallback_remediation(identity, risk)

    prompt = f"""You are an AI CISO assistant analyzing an identity security risk.

Identity: {identity['full_name']} ({identity['department']})
Risk Score: {risk['risk_score']}/100 ({risk['risk_band']})
Risk Factors: {'; '.join(risk['risk_factors'])}
Platforms: {', '.join(set(a['platform'] for a in identity['platform_accounts']))}

Respond in exactly this format:
SUMMARY: <one sentence on why this identity is risky>
IMPACT: <one sentence on business impact if compromised>
STEPS:
- <remediation step 1>
- <remediation step 2>
- <remediation step 3>
"""
    try:
        response = client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=400,
        )
        text = response.choices[0].message.content
        return _parse_ai_response(text, identity, risk)
    except Exception:
        return _fallback_remediation(identity, risk)


def _parse_ai_response(text: str, identity: dict, risk: dict) -> dict:
    try:
        summary = text.split("SUMMARY:")[1].split("IMPACT:")[0].strip()
        impact = text.split("IMPACT:")[1].split("STEPS:")[0].strip()
        steps_block = text.split("STEPS:")[1].strip()
        steps = [s.strip("- ").strip() for s in steps_block.split("\n") if s.strip()]
        return {
            "summary": summary,
            "business_impact": impact,
            "remediation_steps": steps or ["Review access manually."],
            "source": "groq",
        }
    except Exception:
        return _fallback_remediation(identity, risk)


def ask_copilot(question: str, context_summary: str) -> str:
    """Free-form Q&A fallback for questions the rule-based copilot router
    (see routers/copilot.py) can't answer with a direct DB query."""
    client = _get_client()
    if client is None:
        return ("I can't reach the AI service right now, but here's what I have: "
                f"{context_summary}")
    try:
        prompt = (
            "You are an identity security analyst copilot for a SOC team. "
            f"Context data: {context_summary}\n\nQuestion: {question}\n"
            "Answer concisely in 2-4 sentences, referencing the evidence above."
        )
        response = client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return ("I can't reach the AI service right now, but here's what I have: "
                f"{context_summary}")
