import logging
import re
from typing import Optional, List, Tuple, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Template
from app.schemas.schemas import TemplateCreate, TemplateUpdate

logger = logging.getLogger(__name__)


class TemplateService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_template(self, data: TemplateCreate, user_id: Optional[int] = None) -> Template:
        template = Template(
            name=data.name,
            content_pattern=data.content_pattern,
            variables=data.variables or [],
            category=data.category,
            is_active=data.is_active,
        )
        template.user_id = user_id
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        logger.info("Created template id=%d name='%s'", template.id, template.name)
        return template

    def get_templates(
        self,
        skip: int = 0,
        limit: int = 20,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        user_id: Optional[int] = None,
    ) -> Tuple[List[Template], int]:
        query = self.db.query(Template)
        if user_id is not None:
            query = query.filter(Template.user_id == user_id)
        if category:
            query = query.filter(Template.category == category)
        if is_active is not None:
            query = query.filter(Template.is_active == is_active)
        total = query.count()
        templates = (
            query.order_by(desc(Template.created_at)).offset(skip).limit(limit).all()
        )
        return templates, total

    def get_template(self, template_id: int, user_id: Optional[int] = None) -> Template:
        query = self.db.query(Template).filter(Template.id == template_id)
        if user_id is not None:
            query = query.filter(Template.user_id == user_id)
        template = query.first()
        if not template:
            raise HTTPException(
                status_code=404, detail=f"Template {template_id} not found."
            )
        return template

    def update_template(self, template_id: int, data: TemplateUpdate, user_id: Optional[int] = None) -> Template:
        template = self.get_template(template_id, user_id=user_id)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)
        self.db.commit()
        self.db.refresh(template)
        logger.info("Updated template id=%d", template.id)
        return template

    def delete_template(self, template_id: int, user_id: Optional[int] = None) -> bool:
        template = self.get_template(template_id, user_id=user_id)
        self.db.delete(template)
        self.db.commit()
        logger.info("Deleted template id=%d", template_id)
        return True

    def render_template(
        self, template_id: int, variables: Dict[str, str]
    ) -> str:
        template = self.get_template(template_id)
        content = template.content_pattern
        for key, value in variables.items():
            placeholder = "{{" + key + "}}"
            content = content.replace(placeholder, value)
        # Check for any remaining unresolved placeholders
        remaining = re.findall(r"\{\{(\w+)\}\}", content)
        if remaining:
            logger.warning(
                "Unresolved variables in template %d: %s", template_id, remaining
            )
        if len(content) > 280:
            logger.warning(
                "Rendered template %d exceeds 280 chars (%d)", template_id, len(content)
            )
        return content
