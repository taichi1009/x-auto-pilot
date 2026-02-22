"""Per-user settings helper: reads from AppSetting DB with fallback to env vars."""

import logging
from typing import Optional, Dict

from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import AppSetting

logger = logging.getLogger(__name__)

# Mapping from AppSetting key -> global Settings attribute name
_ENV_FALLBACK: Dict[str, str] = {
    "x_api_key": "X_API_KEY",
    "x_api_secret": "X_API_SECRET",
    "x_access_token": "X_ACCESS_TOKEN",
    "x_access_token_secret": "X_ACCESS_TOKEN_SECRET",
    "x_bearer_token": "X_BEARER_TOKEN",
    "api_tier": "X_API_TIER",
    "claude_api_key": "CLAUDE_API_KEY",
    "openai_api_key": "OPENAI_API_KEY",
    "ai_provider": "AI_PROVIDER",
}


def get_user_setting(db: Session, user_id: int, key: str) -> str:
    """Read a single setting for user_id from DB, fallback to env var."""
    row = (
        db.query(AppSetting)
        .filter(AppSetting.user_id == user_id, AppSetting.key == key)
        .first()
    )
    if row and row.value:
        return row.value

    # Fallback to global env var
    attr = _ENV_FALLBACK.get(key)
    if attr:
        return getattr(settings, attr, "")
    return ""


def get_ai_settings(db: Session, user_id: int) -> dict:
    """Return AI-related settings for a user."""
    return {
        "provider": get_user_setting(db, user_id, "ai_provider"),
        "claude_api_key": get_user_setting(db, user_id, "claude_api_key"),
        "openai_api_key": get_user_setting(db, user_id, "openai_api_key"),
    }


def get_x_api_settings(db: Session, user_id: int) -> dict:
    """Return X API credentials + tier for a user."""
    return {
        "api_key": get_user_setting(db, user_id, "x_api_key"),
        "api_secret": get_user_setting(db, user_id, "x_api_secret"),
        "access_token": get_user_setting(db, user_id, "x_access_token"),
        "access_token_secret": get_user_setting(db, user_id, "x_access_token_secret"),
        "bearer_token": get_user_setting(db, user_id, "x_bearer_token"),
        "api_tier": get_user_setting(db, user_id, "api_tier"),
    }
