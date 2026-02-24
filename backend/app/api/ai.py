from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    AIGenerateRequest,
    AIGenerateResponse,
    AIImproveRequest,
    AIImproveResponse,
    ImpressionPredictRequest,
    ImpressionPredictResponse,
)
from app.services.ai_service import create_ai_service
from app.services.persona_service import PersonaService
from app.services.strategy_service import StrategyService
from app.services.prediction_service import PredictionService
from app.services.user_settings import get_user_setting
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _resolve_max_length(db: Session, user_id: int, request_max_length, post_format: str) -> int:
    """Resolve max_length: request > user setting > format default."""
    if request_max_length:
        return request_max_length
    if post_format == "long_form":
        user_val = get_user_setting(db, user_id, "max_length_long_form")
        return int(user_val) if user_val else 5000
    else:
        user_val = get_user_setting(db, user_id, "max_length_tweet")
        return int(user_val) if user_val else 280


@router.post("/generate", response_model=AIGenerateResponse)
def generate_posts(
    data: AIGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = create_ai_service(db, current_user.id)

    # Resolve language: request > user setting > default
    language = data.language or get_user_setting(db, current_user.id, "language") or "ja"

    # Resolve max_length: request > user setting > format default
    max_length = _resolve_max_length(db, current_user.id, data.max_length, data.post_format)

    # Get persona and strategy if requested
    persona = None
    strategy = None
    if data.use_persona:
        persona_service = PersonaService(db)
        persona = persona_service.get_active_persona(user_id=current_user.id)
    strategy_service = StrategyService(db)
    strategy = strategy_service.get_active_strategy(user_id=current_user.id)

    result = service.generate_posts(
        genre=data.genre,
        style=data.style,
        count=data.count,
        custom_prompt=data.custom_prompt,
        post_format=data.post_format,
        persona=persona,
        strategy=strategy,
        thread_length=data.thread_length,
        language=language,
        max_length=max_length,
    )
    return AIGenerateResponse(
        posts=result.get("posts", []),
        threads=result.get("threads"),
        genre=data.genre,
        style=data.style,
        post_format=result.get("post_format", data.post_format),
    )


@router.post("/improve", response_model=AIImproveResponse)
def improve_post(
    data: AIImproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = create_ai_service(db, current_user.id)
    language = data.language or get_user_setting(db, current_user.id, "language") or "ja"
    max_length = _resolve_max_length(db, current_user.id, data.max_length, data.post_format)
    result = service.improve_post(
        content=data.content,
        feedback=data.feedback,
        language=language,
        max_length=max_length,
    )
    return AIImproveResponse(**result)


@router.post("/predict", response_model=ImpressionPredictResponse)
def predict_impressions(
    data: ImpressionPredictRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PredictionService(db, user_id=current_user.id)
    result = service.predict_impressions(
        content=data.content,
        post_format=data.post_format,
    )
    return ImpressionPredictResponse(**result)
