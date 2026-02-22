from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    ContentStrategyCreate,
    ContentStrategyUpdate,
    ContentStrategyResponse,
)
from app.services.strategy_service import StrategyService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("", response_model=list[ContentStrategyResponse])
def list_strategies(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    strategies, _ = service.get_strategies(skip=skip, limit=limit, user_id=current_user.id)
    return strategies


@router.get("/active", response_model=Optional[ContentStrategyResponse])
def get_active_strategy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    return service.get_active_strategy(user_id=current_user.id)


@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    return service.get_recommendations(user_id=current_user.id)


@router.post("", response_model=ContentStrategyResponse, status_code=201)
def create_strategy(
    data: ContentStrategyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    return service.create_strategy(data.model_dump(), user_id=current_user.id)


@router.put("/{strategy_id}", response_model=ContentStrategyResponse)
def update_strategy(
    strategy_id: int,
    data: ContentStrategyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    update_data = data.model_dump(exclude_unset=True)
    return service.update_strategy(strategy_id, update_data, user_id=current_user.id)


@router.delete("/{strategy_id}")
def delete_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    service.delete_strategy(strategy_id, user_id=current_user.id)
    return {"detail": "Strategy deleted."}


@router.post("/{strategy_id}/activate", response_model=ContentStrategyResponse)
def activate_strategy(
    strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StrategyService(db)
    return service.activate_strategy(strategy_id, user_id=current_user.id)
