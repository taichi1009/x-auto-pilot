from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import FollowTargetCreate, FollowTargetResponse, FollowStatsResponse
from app.services.follow_service import FollowService

router = APIRouter(prefix="/api/follows", tags=["follows"])


@router.get("", response_model=List[FollowTargetResponse])
def list_follow_targets(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    service = FollowService(db)
    targets, total = service.get_follow_targets(
        skip=skip, limit=limit, status=status, action=action
    )
    return targets


@router.post("/discover")
def discover_users(
    query: str = Query(..., description="Search query for user discovery"),
    db: Session = Depends(get_db),
):
    service = FollowService(db)
    users = service.discover_users(query)
    return {"users": users}


@router.post("/{target_id}/execute", response_model=FollowTargetResponse)
def execute_follow(target_id: int, db: Session = Depends(get_db)):
    service = FollowService(db)
    return service.execute_follow(target_id)


@router.get("/stats", response_model=FollowStatsResponse)
def get_follow_stats(db: Session = Depends(get_db)):
    service = FollowService(db)
    stats = service.get_follow_stats()
    return stats
