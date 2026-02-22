from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import User, UserRole, SubscriptionTier, Post, PostStatus
from app.schemas.schemas import UserResponse, AdminUserUpdate, AdminStats, PostResponse
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Pricing for revenue calculation
TIER_PRICES = {
    "free": 0,
    "basic": 50,
    "pro": 100,
    "enterprise": 120,
}


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role is not None:
        user.role = UserRole(data.role)
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.subscription_tier is not None:
        user.subscription_tier = SubscriptionTier(data.subscription_tier)

    db.commit()
    db.refresh(user)
    return user


@router.get("/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    tier_breakdown = {}
    for tier in SubscriptionTier:
        count = db.query(User).filter(User.subscription_tier == tier).count()
        tier_breakdown[tier.value] = count

    total_posts = db.query(Post).count()

    # Calculate monthly revenue
    monthly_revenue = 0.0
    for tier_name, price in TIER_PRICES.items():
        count = tier_breakdown.get(tier_name, 0)
        # Admin users don't pay
        if tier_name != "free":
            admin_count = (
                db.query(User)
                .filter(
                    User.subscription_tier == SubscriptionTier(tier_name),
                    User.role == UserRole.admin,
                )
                .count()
            )
            monthly_revenue += (count - admin_count) * price

    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        tier_breakdown=tier_breakdown,
        total_posts=total_posts,
        monthly_revenue=monthly_revenue,
    )


@router.get("/posts", response_model=List[PostResponse])
def list_all_posts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return posts
