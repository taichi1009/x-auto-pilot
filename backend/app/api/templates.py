from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import TemplateCreate, TemplateUpdate, TemplateResponse
from app.services.template_service import TemplateService

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    service = TemplateService(db)
    templates, total = service.get_templates(
        skip=skip, limit=limit, category=category, is_active=is_active
    )
    return templates


@router.post("", response_model=TemplateResponse, status_code=201)
def create_template(data: TemplateCreate, db: Session = Depends(get_db)):
    service = TemplateService(db)
    return service.create_template(data)


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int, data: TemplateUpdate, db: Session = Depends(get_db)
):
    service = TemplateService(db)
    return service.update_template(template_id, data)


@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    service = TemplateService(db)
    service.delete_template(template_id)
    return {"detail": "Template deleted successfully."}
