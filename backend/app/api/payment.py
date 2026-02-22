from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.utils.auth import get_current_user
from app.services import payment_service

router = APIRouter(prefix="/api/payment", tags=["payment"])


@router.post("/checkout")
def create_checkout(
    tier: str = Query(..., description="Subscription tier: basic, pro, enterprise"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payment_service.create_checkout_session(
        user=current_user,
        tier=tier,
        success_url="http://localhost:3000/settings?payment=success",
        cancel_url="http://localhost:3000/settings?payment=cancelled",
    )

    # Save stripe_customer_id if it was just created
    db.commit()

    return {"url": url}


@router.post("/portal")
def create_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = payment_service.create_portal_session(
        user=current_user,
        return_url="http://localhost:3000/settings",
    )
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    result = payment_service.handle_webhook_event(payload, sig_header, db)
    return result
