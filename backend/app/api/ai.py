from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    AIGenerateRequest,
    AIGenerateResponse,
    AIImproveRequest,
    AIImproveResponse,
    ImpressionPredictRequest,
    ImpressionPredictResponse,
)
from app.services.ai_service import AIService
from app.services.persona_service import PersonaService
from app.services.strategy_service import StrategyService
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate", response_model=AIGenerateResponse)
def generate_posts(data: AIGenerateRequest, db: Session = Depends(get_db)):
    service = AIService()

    # Get persona and strategy if requested
    persona = None
    strategy = None
    if data.use_persona:
        persona_service = PersonaService(db)
        persona = persona_service.get_active_persona()
    strategy_service = StrategyService(db)
    strategy = strategy_service.get_active_strategy()

    result = service.generate_posts(
        genre=data.genre,
        style=data.style,
        count=data.count,
        custom_prompt=data.custom_prompt,
        post_format=data.post_format,
        persona=persona,
        strategy=strategy,
        thread_length=data.thread_length,
    )
    return AIGenerateResponse(
        posts=result.get("posts", []),
        threads=result.get("threads"),
        genre=data.genre,
        style=data.style,
        post_format=result.get("post_format", data.post_format),
    )


@router.post("/improve", response_model=AIImproveResponse)
def improve_post(data: AIImproveRequest, db: Session = Depends(get_db)):
    service = AIService()
    result = service.improve_post(
        content=data.content,
        feedback=data.feedback,
    )
    return AIImproveResponse(**result)


@router.post("/predict", response_model=ImpressionPredictResponse)
def predict_impressions(
    data: ImpressionPredictRequest, db: Session = Depends(get_db)
):
    service = PredictionService(db)
    result = service.predict_impressions(
        content=data.content,
        post_format=data.post_format,
    )
    return ImpressionPredictResponse(**result)
