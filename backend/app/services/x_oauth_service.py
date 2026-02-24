"""X OAuth 2.0 PKCE service for account linking.

Implements the full OAuth 2.0 Authorization Code Flow with PKCE
using httpx (no tweepy OAuth2UserHandler dependency).
"""

import hashlib
import logging
import secrets
import time
from base64 import urlsafe_b64encode
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx
import tweepy
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import AppSetting

logger = logging.getLogger(__name__)

# In-memory store for PKCE state -> verifier mapping.
# Single-process only; use Redis for multi-worker deployments.
_pkce_store: Dict[str, Dict[str, Any]] = {}

SCOPES = [
    "tweet.read",
    "tweet.write",
    "users.read",
    "follows.read",
    "follows.write",
    "offline.access",
]

X_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"
X_TOKEN_URL = "https://api.x.com/2/oauth2/token"

# AppSetting keys used for OAuth 2.0 tokens
OAUTH2_KEYS = [
    "x_oauth2_access_token",
    "x_oauth2_refresh_token",
    "x_oauth2_token_expires_at",
    "x_oauth_method",
    "x_connected_username",
    "x_connected_user_id",
]


def _generate_code_verifier() -> str:
    """Generate a PKCE code_verifier (43-128 chars, URL-safe)."""
    return secrets.token_urlsafe(64)[:128]


def _generate_code_challenge(verifier: str) -> str:
    """Generate a PKCE code_challenge (S256) from the verifier."""
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _set_user_setting(
    db: Session, user_id: int, key: str, value: str, category: str = "oauth"
) -> None:
    """Upsert an AppSetting row."""
    row = (
        db.query(AppSetting)
        .filter(AppSetting.user_id == user_id, AppSetting.key == key)
        .first()
    )
    if row:
        row.value = value
    else:
        db.add(AppSetting(user_id=user_id, key=key, value=value, category=category))


def _get_user_setting(db: Session, user_id: int, key: str) -> Optional[str]:
    """Read a single AppSetting value."""
    row = (
        db.query(AppSetting)
        .filter(AppSetting.user_id == user_id, AppSetting.key == key)
        .first()
    )
    return row.value if row else None


def create_authorization_url(user_id: int) -> str:
    """Build a PKCE authorization URL and persist verifier in memory."""
    if not settings.X_CLIENT_ID:
        raise ValueError("X_CLIENT_ID is not configured")

    code_verifier = _generate_code_verifier()
    code_challenge = _generate_code_challenge(code_verifier)
    state = secrets.token_urlsafe(32)

    params = {
        "response_type": "code",
        "client_id": settings.X_CLIENT_ID,
        "redirect_uri": settings.X_OAUTH_REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }

    auth_url = f"{X_AUTHORIZE_URL}?{urlencode(params)}"

    _pkce_store[state] = {
        "code_verifier": code_verifier,
        "user_id": user_id,
        "created_at": time.time(),
    }

    # Expire old entries (>10 min)
    _cleanup_pkce_store()

    return auth_url


def _cleanup_pkce_store() -> None:
    """Remove PKCE entries older than 10 minutes."""
    now = time.time()
    expired = [k for k, v in _pkce_store.items() if now - v["created_at"] > 600]
    for k in expired:
        del _pkce_store[k]


def exchange_code_for_tokens(state: str, code: str, db: Session) -> Dict[str, Any]:
    """Exchange the authorization code for tokens and persist them."""
    entry = _pkce_store.pop(state, None)
    if entry is None:
        raise ValueError("Invalid or expired state parameter")

    user_id = entry["user_id"]
    code_verifier = entry["code_verifier"]

    # Exchange code for tokens via X API
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.X_OAUTH_REDIRECT_URI,
        "code_verifier": code_verifier,
        "client_id": settings.X_CLIENT_ID,
    }

    auth = None
    if settings.X_CLIENT_SECRET:
        auth = (settings.X_CLIENT_ID, settings.X_CLIENT_SECRET)

    resp = httpx.post(X_TOKEN_URL, data=data, auth=auth, timeout=30)
    if resp.status_code != 200:
        logger.error("Token exchange failed: %s %s", resp.status_code, resp.text)
        raise ValueError(f"Token exchange failed: {resp.text}")

    token_data = resp.json()
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token", "")
    expires_in = token_data.get("expires_in", 7200)
    expires_at = str(int(time.time() + expires_in))

    # Use the access token to get user info via tweepy
    client = tweepy.Client(bearer_token=access_token)
    me = client.get_me(user_auth=False)
    if me.data is None:
        raise ValueError("Could not retrieve X user info with the new token")

    x_username = me.data.username
    x_user_id = str(me.data.id)

    # Persist tokens
    _set_user_setting(db, user_id, "x_oauth2_access_token", access_token)
    _set_user_setting(db, user_id, "x_oauth2_refresh_token", refresh_token)
    _set_user_setting(db, user_id, "x_oauth2_token_expires_at", expires_at)
    _set_user_setting(db, user_id, "x_oauth_method", "oauth2")
    _set_user_setting(db, user_id, "x_connected_username", x_username)
    _set_user_setting(db, user_id, "x_connected_user_id", x_user_id)
    db.commit()

    logger.info("OAuth 2.0 tokens saved for user_id=%d (@%s)", user_id, x_username)

    return {
        "username": x_username,
        "x_user_id": x_user_id,
        "user_id": user_id,
    }


def refresh_oauth2_token(db: Session, user_id: int) -> bool:
    """Refresh the OAuth 2.0 access token using the stored refresh token."""
    refresh_token = _get_user_setting(db, user_id, "x_oauth2_refresh_token")
    if not refresh_token:
        logger.warning("No refresh token for user_id=%d", user_id)
        return False

    if not settings.X_CLIENT_ID:
        logger.error("X_CLIENT_ID not configured, cannot refresh token")
        return False

    try:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.X_CLIENT_ID,
        }
        auth = None
        if settings.X_CLIENT_SECRET:
            auth = (settings.X_CLIENT_ID, settings.X_CLIENT_SECRET)

        resp = httpx.post(X_TOKEN_URL, data=data, auth=auth, timeout=30)
        resp.raise_for_status()
        token_data = resp.json()

        new_access = token_data["access_token"]
        new_refresh = token_data.get("refresh_token", refresh_token)
        expires_in = token_data.get("expires_in", 7200)
        expires_at = str(int(time.time() + expires_in))

        _set_user_setting(db, user_id, "x_oauth2_access_token", new_access)
        _set_user_setting(db, user_id, "x_oauth2_refresh_token", new_refresh)
        _set_user_setting(db, user_id, "x_oauth2_token_expires_at", expires_at)
        db.commit()

        logger.info("OAuth 2.0 token refreshed for user_id=%d", user_id)
        return True
    except Exception as exc:
        logger.error("Failed to refresh token for user_id=%d: %s", user_id, exc)
        return False


def disconnect_x_account(db: Session, user_id: int) -> None:
    """Remove all OAuth 2.0 related AppSetting rows for the user."""
    db.query(AppSetting).filter(
        AppSetting.user_id == user_id,
        AppSetting.key.in_(OAUTH2_KEYS),
    ).delete(synchronize_session="fetch")
    db.commit()
    logger.info("X account disconnected for user_id=%d", user_id)


def get_x_connection_status(db: Session, user_id: int) -> Dict[str, Any]:
    """Return the current X connection status for a user."""
    method = _get_user_setting(db, user_id, "x_oauth_method")
    username = _get_user_setting(db, user_id, "x_connected_username") or ""
    x_user_id = _get_user_setting(db, user_id, "x_connected_user_id") or ""
    expires_at_str = _get_user_setting(db, user_id, "x_oauth2_token_expires_at")

    token_expired = False
    if method == "oauth2" and expires_at_str:
        try:
            token_expired = time.time() > float(expires_at_str)
        except ValueError:
            token_expired = True

    connected = method is not None and method != ""

    # Also check OAuth 1.0a: if no oauth_method is set, check for manual keys
    if not connected:
        from app.services.user_settings import get_user_setting as get_setting
        api_key = get_setting(db, user_id, "x_api_key")
        access_token = get_setting(db, user_id, "x_access_token")
        if api_key and access_token:
            connected = True
            method = "oauth1"

    return {
        "connected": connected,
        "method": method,
        "username": username,
        "x_user_id": x_user_id,
        "token_expired": token_expired,
    }
