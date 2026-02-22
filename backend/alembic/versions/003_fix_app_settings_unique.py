"""Fix app_settings unique constraint: per-user key instead of global key

Revision ID: 003_fix_app_settings_unique
Revises: 002_persona_strategy_longform
Create Date: 2026-02-23 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003_fix_app_settings_unique"
down_revision: Union[str, None] = "002_persona_strategy_longform"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite requires batch mode to alter constraints
    with op.batch_alter_table("app_settings") as batch_op:
        # Drop the global unique constraint on key
        batch_op.drop_index("ix_app_settings_key")
        batch_op.drop_constraint("uq_app_settings_key", type_="unique")
        # Re-create non-unique index on key
        batch_op.create_index("ix_app_settings_key", ["key"], unique=False)
        # Add composite unique constraint on (user_id, key)
        batch_op.create_unique_constraint(
            "uq_app_settings_user_key", ["user_id", "key"]
        )


def downgrade() -> None:
    with op.batch_alter_table("app_settings") as batch_op:
        batch_op.drop_constraint("uq_app_settings_user_key", type_="unique")
        batch_op.drop_index("ix_app_settings_key")
        batch_op.create_index("ix_app_settings_key", ["key"], unique=True)
