from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import FollowTargetCreate, FollowTargetResponse, FollowStatsResponse
from app.services.follow_service import FollowService
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/follows", tags=["follows"])


@router.get("", response_model=List[FollowTargetResponse])
def list_follow_targets(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FollowService(db, user_id=current_user.id)
    targets, total = service.get_follow_targets(
        skip=skip, limit=limit, status=status, action=action,
        user_id=current_user.id,
    )
    return targets


@router.post("/discover")
def discover_users(
    query: str = Query(..., description="Search query for user discovery"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FollowService(db, user_id=current_user.id)
    users = service.discover_users(query, user_id=current_user.id)
    return {"users": users}


@router.post("/{target_id}/execute", response_model=FollowTargetResponse)
def execute_follow(
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FollowService(db, user_id=current_user.id)
    return service.execute_follow(target_id, user_id=current_user.id)


@router.get("/stats", response_model=FollowStatsResponse)
def get_follow_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = FollowService(db, user_id=current_user.id)
    stats = service.get_follow_stats(user_id=current_user.id)
    return stats


# --- Admin endpoints ---


@router.get("/admin/{user_id}", response_model=List[FollowTargetResponse])
def admin_list_follow_targets(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = FollowService(db, user_id=user_id)
    targets, total = service.get_follow_targets(
        skip=skip, limit=limit, status=status, action=action,
        user_id=user_id,
    )
    return targets


@router.post("/admin/{user_id}/discover")
def admin_discover_users(
    user_id: int,
    query: str = Query(..., description="Search query for user discovery"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = FollowService(db, user_id=user_id)
    users = service.discover_users(query, user_id=user_id)
    return {"users": users}


@router.post("/admin/{user_id}/{target_id}/execute", response_model=FollowTargetResponse)
def admin_execute_follow(
    user_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = FollowService(db, user_id=user_id)
    return service.execute_follow(target_id, user_id=user_id)


@router.get("/admin/{user_id}/stats", response_model=FollowStatsResponse)
def admin_get_follow_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = FollowService(db, user_id=user_id)
    stats = service.get_follow_stats(user_id=user_id)
    return stats
