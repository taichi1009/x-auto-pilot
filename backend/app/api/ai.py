from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import (
    AIGenerateRequest,
    AIGenerateResponse,
    AIImproveRequest,
    AIImproveResponse,
)
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate", response_model=AIGenerateResponse)
def generate_posts(data: AIGenerateRequest, db: Session = Depends(get_db)):
    service = AIService()
    posts = service.generate_posts(
        genre=data.genre,
        style=data.style,
        count=data.count,
        custom_prompt=data.custom_prompt,
    )
    return AIGenerateResponse(
        posts=posts,
        genre=data.genre,
        style=data.style,
    )


@router.post("/improve", response_model=AIImproveResponse)
def improve_post(data: AIImproveRequest, db: Session = Depends(get_db)):
    service = AIService()
    result = service.improve_post(
        content=data.content,
        feedback=data.feedback,
    )
    return AIImproveResponse(**result)
