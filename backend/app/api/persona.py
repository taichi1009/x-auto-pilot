from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import PersonaCreate, PersonaUpdate, PersonaResponse
from app.services.persona_service import PersonaService
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/persona", tags=["persona"])


@router.get("", response_model=list[PersonaResponse])
def list_personas(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    personas, _ = service.get_personas(skip=skip, limit=limit, user_id=current_user.id)
    return personas


@router.get("/active", response_model=Optional[PersonaResponse])
def get_active_persona(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    persona = service.get_active_persona(user_id=current_user.id)
    return persona


@router.post("", response_model=PersonaResponse, status_code=201)
def create_persona(
    data: PersonaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    return service.create_persona(data.model_dump(), user_id=current_user.id)


@router.put("/{persona_id}", response_model=PersonaResponse)
def update_persona(
    persona_id: int,
    data: PersonaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    update_data = data.model_dump(exclude_unset=True)
    return service.update_persona(persona_id, update_data, user_id=current_user.id)


@router.delete("/{persona_id}")
def delete_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    service.delete_persona(persona_id, user_id=current_user.id)
    return {"detail": "Persona deleted."}


@router.post("/{persona_id}/activate", response_model=PersonaResponse)
def activate_persona(
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PersonaService(db)
    return service.activate_persona(persona_id, user_id=current_user.id)


# --- Admin endpoints ---


@router.get("/admin/{user_id}", response_model=list[PersonaResponse])
def admin_list_personas(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    personas, _ = service.get_personas(skip=skip, limit=limit, user_id=user_id)
    return personas


@router.get("/admin/{user_id}/active", response_model=Optional[PersonaResponse])
def admin_get_active_persona(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    return service.get_active_persona(user_id=user_id)


@router.post("/admin/{user_id}", response_model=PersonaResponse, status_code=201)
def admin_create_persona(
    user_id: int,
    data: PersonaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    return service.create_persona(data.model_dump(), user_id=user_id)


@router.put("/admin/{user_id}/{persona_id}", response_model=PersonaResponse)
def admin_update_persona(
    user_id: int,
    persona_id: int,
    data: PersonaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    update_data = data.model_dump(exclude_unset=True)
    return service.update_persona(persona_id, update_data, user_id=user_id)


@router.delete("/admin/{user_id}/{persona_id}")
def admin_delete_persona(
    user_id: int,
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    service.delete_persona(persona_id, user_id=user_id)
    return {"detail": "Persona deleted."}


@router.post("/admin/{user_id}/{persona_id}/activate", response_model=PersonaResponse)
def admin_activate_persona(
    user_id: int,
    persona_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PersonaService(db)
    return service.activate_persona(persona_id, user_id=user_id)
