"""Subscription plan definitions and limits."""

PLANS = {
    "basic": {
        "name": "Basic",
        "max_users": 5,
        "max_doctors": 100,
        "max_visits_per_month": 500,
        "price_egp": 0,
    },
    "professional": {
        "name": "Professional",
        "max_users": 20,
        "max_doctors": 500,
        "max_visits_per_month": 2000,
        "price_egp": 1500,
    },
    "enterprise": {
        "name": "Enterprise",
        "max_users": 999999,
        "max_doctors": 999999,
        "max_visits_per_month": 999999,
        "price_egp": 5000,
    },
}


def get_plan(plan_key: str) -> dict:
    return PLANS.get(plan_key, PLANS["basic"])


def check_limit(plan_key: str, resource: str, current_count: int) -> bool:
    """Return True if user CAN add one more of `resource`."""
    plan = get_plan(plan_key)
    limit_key = f"max_{resource}"
    limit = plan.get(limit_key, 0)
    return current_count < limit