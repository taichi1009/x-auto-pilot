from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import PostAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_overview(days=days)


@router.get("/posts/{post_id}", response_model=List[PostAnalyticsResponse])
def get_post_analytics(post_id: int, db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_post_analytics(post_id)


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_trends(days=days)


@router.post("/collect")
def collect_analytics(db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    result = service.collect_analytics()
    return result
