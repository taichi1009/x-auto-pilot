from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.schemas.schemas import PersonaCreate, PersonaUpdate, PersonaResponse
from app.services.persona_service import PersonaService

router = APIRouter(prefix="/api/persona", tags=["persona"])


@router.get("", response_model=list[PersonaResponse])
def list_personas(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = PersonaService(db)
    personas, _ = service.get_personas(skip=skip, limit=limit)
    return personas


@router.get("/active", response_model=Optional[PersonaResponse])
def get_active_persona(db: Session = Depends(get_db)):
    service = PersonaService(db)
    persona = service.get_active_persona()
    return persona


@router.post("", response_model=PersonaResponse, status_code=201)
def create_persona(data: PersonaCreate, db: Session = Depends(get_db)):
    service = PersonaService(db)
    return service.create_persona(data.model_dump())


@router.put("/{persona_id}", response_model=PersonaResponse)
def update_persona(
    persona_id: int, data: PersonaUpdate, db: Session = Depends(get_db)
):
    service = PersonaService(db)
    update_data = data.model_dump(exclude_unset=True)
    return service.update_persona(persona_id, update_data)


@router.delete("/{persona_id}")
def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    service = PersonaService(db)
    service.delete_persona(persona_id)
    return {"detail": "Persona deleted."}


@router.post("/{persona_id}/activate", response_model=PersonaResponse)
def activate_persona(persona_id: int, db: Session = Depends(get_db)):
    service = PersonaService(db)
    return service.activate_persona(persona_id)
