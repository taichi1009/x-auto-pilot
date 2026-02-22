import logging

import stripe
from fastapi import HTTPException

from app.config import settings
from app.models.models import User, UserRole, SubscriptionTier

logger = logging.getLogger(__name__)

TIER_PRICE_MAP = {
    "basic": lambda: settings.STRIPE_BASIC_PRICE_ID,
    "pro": lambda: settings.STRIPE_PRO_PRICE_ID,
    "enterprise": lambda: settings.STRIPE_ENTERPRISE_PRICE_ID,
}

PRICE_TO_TIER = {}


def _init_stripe():
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_price_to_tier_map():
    """Build reverse mapping from price_id to tier."""
    return {
        settings.STRIPE_BASIC_PRICE_ID: SubscriptionTier.basic,
        settings.STRIPE_PRO_PRICE_ID: SubscriptionTier.pro,
        settings.STRIPE_ENTERPRISE_PRICE_ID: SubscriptionTier.enterprise,
    }


def create_checkout_session(user: User, tier: str, success_url: str, cancel_url: str) -> str:
    _init_stripe()

    if user.role == UserRole.admin:
        raise HTTPException(
            status_code=400,
            detail="Admin users have full access without payment",
        )

    price_getter = TIER_PRICE_MAP.get(tier)
    if not price_getter:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}")

    price_id = price_getter()
    if not price_id:
        raise HTTPException(
            status_code=500,
            detail=f"Stripe price ID not configured for tier: {tier}",
        )

    # Create or get Stripe customer
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)},
        )
        customer_id = customer.id
    else:
        customer_id = user.stripe_customer_id

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user.id), "tier": tier},
    )

    return session.url


def create_portal_session(user: User, return_url: str) -> str:
    _init_stripe()

    if not user.stripe_customer_id:
        raise HTTPException(
            status_code=400,
            detail="No active subscription found",
        )

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=return_url,
    )

    return session.url


def handle_webhook_event(payload: bytes, sig_header: str, db) -> dict:
    _init_stripe()

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data, db)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data, db)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data, db)

    return {"status": "ok"}


def _handle_checkout_completed(session_data: dict, db):
    user_id = session_data.get("metadata", {}).get("user_id")
    tier = session_data.get("metadata", {}).get("tier")
    customer_id = session_data.get("customer")
    subscription_id = session_data.get("subscription")

    if not user_id:
        logger.warning("Checkout completed without user_id in metadata")
        return

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        logger.warning("User %s not found for checkout", user_id)
        return

    user.stripe_customer_id = customer_id
    user.stripe_subscription_id = subscription_id
    if tier:
        user.subscription_tier = SubscriptionTier(tier)
    db.commit()
    logger.info("Checkout completed for user %s, tier=%s", user_id, tier)


def _handle_subscription_updated(subscription_data: dict, db):
    customer_id = subscription_data.get("customer")
    price_id = None
    items = subscription_data.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning("User not found for customer %s", customer_id)
        return

    if price_id:
        price_tier_map = _get_price_to_tier_map()
        new_tier = price_tier_map.get(price_id)
        if new_tier:
            user.subscription_tier = new_tier
            db.commit()
            logger.info("Subscription updated for user %s, tier=%s", user.id, new_tier.value)


def _handle_subscription_deleted(subscription_data: dict, db):
    customer_id = subscription_data.get("customer")

    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        logger.warning("User not found for customer %s", customer_id)
        return

    user.subscription_tier = SubscriptionTier.free
    user.stripe_subscription_id = None
    db.commit()
    logger.info("Subscription deleted for user %s, reverted to free", user.id)
