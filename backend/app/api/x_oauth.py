"""X OAuth 2.0 PKCE endpoints for account linking."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.utils.auth import get_current_user, get_current_admin
from app.services.x_oauth_service import (
    create_authorization_url,
    exchange_code_for_tokens,
    disconnect_x_account,
    get_x_connection_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/x-oauth", tags=["x-oauth"])


@router.get("/authorize")
def authorize(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an authorization URL for the current user."""
    try:
        url = create_authorization_url(current_user.id)
        return {"authorization_url": url}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/callback")
def callback(
    state: str = Query(...),
    code: str = Query(...),
    db: Session = Depends(get_db),
):
    """Exchange authorization code for tokens (called by the frontend callback page)."""
    try:
        result = exchange_code_for_tokens(state, code, db)
        return {
            "success": True,
            "username": result["username"],
            "x_user_id": result["x_user_id"],
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("OAuth callback error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to complete OAuth flow")


@router.get("/status")
def status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's X connection status."""
    return get_x_connection_status(db, current_user.id)


@router.post("/disconnect")
def disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect the current user's X account (OAuth 2.0)."""
    disconnect_x_account(db, current_user.id)
    return {"success": True}


# --- Admin endpoints ---


@router.get("/admin/status/bulk")
def admin_bulk_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Admin: get X connection status for all users."""
    users = db.query(User).all()
    result = {}
    for user in users:
        result[str(user.id)] = get_x_connection_status(db, user.id)
    return result


@router.get("/admin/status/{user_id}")
def admin_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Admin: get a specific user's X connection status."""
    return get_x_connection_status(db, user_id)


@router.post("/admin/disconnect/{user_id}")
def admin_disconnect(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """Admin: disconnect a specific user's X account."""
    disconnect_x_account(db, user_id)
    return {"success": True}
