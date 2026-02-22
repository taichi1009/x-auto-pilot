import logging
from typing import Optional, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Persona

logger = logging.getLogger(__name__)


class PersonaService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_persona(self, data: dict, user_id: Optional[int] = None) -> Persona:
        persona = Persona(**data)
        persona.user_id = user_id
        self.db.add(persona)
        self.db.commit()
        self.db.refresh(persona)
        logger.info("Created persona id=%d name=%s", persona.id, persona.name)
        return persona

    def get_personas(
        self, skip: int = 0, limit: int = 20, user_id: Optional[int] = None
    ) -> Tuple[List[Persona], int]:
        query = self.db.query(Persona)
        if user_id is not None:
            query = query.filter(Persona.user_id == user_id)
        total = query.count()
        personas = (
            query.order_by(desc(Persona.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return personas, total

    def get_persona(self, persona_id: int, user_id: Optional[int] = None) -> Persona:
        query = self.db.query(Persona).filter(Persona.id == persona_id)
        if user_id is not None:
            query = query.filter(Persona.user_id == user_id)
        persona = query.first()
        if not persona:
            raise HTTPException(
                status_code=404, detail=f"Persona {persona_id} not found."
            )
        return persona

    def update_persona(self, persona_id: int, data: dict, user_id: Optional[int] = None) -> Persona:
        persona = self.get_persona(persona_id, user_id=user_id)
        for field, value in data.items():
            setattr(persona, field, value)
        self.db.commit()
        self.db.refresh(persona)
        logger.info("Updated persona id=%d", persona.id)
        return persona

    def delete_persona(self, persona_id: int, user_id: Optional[int] = None) -> bool:
        persona = self.get_persona(persona_id, user_id=user_id)
        self.db.delete(persona)
        self.db.commit()
        logger.info("Deleted persona id=%d", persona_id)
        return True

    def get_active_persona(self, user_id: Optional[int] = None) -> Optional[Persona]:
        query = self.db.query(Persona).filter(Persona.is_active == True)
        if user_id is not None:
            query = query.filter(Persona.user_id == user_id)
        return query.first()

    def activate_persona(self, persona_id: int, user_id: Optional[int] = None) -> Persona:
        # Deactivate all personas (scoped by user_id if provided)
        deactivate_query = self.db.query(Persona)
        if user_id is not None:
            deactivate_query = deactivate_query.filter(Persona.user_id == user_id)
        deactivate_query.update({"is_active": False})
        # Activate the specified one
        persona = self.get_persona(persona_id, user_id=user_id)
        persona.is_active = True
        self.db.commit()
        self.db.refresh(persona)
        logger.info("Activated persona id=%d", persona.id)
        return persona
