"""Add persona, strategy, thread, impression prediction tables and extend posts

Revision ID: 002_persona_strategy_longform
Revises: 001_initial
Create Date: 2026-02-22 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_persona_strategy_longform"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create personas table
    op.create_table(
        "personas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("personality_traits", sa.JSON(), nullable=True),
        sa.Column("background_story", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.String(length=500), nullable=True),
        sa.Column("expertise_areas", sa.JSON(), nullable=True),
        sa.Column("communication_style", sa.String(length=100), nullable=True),
        sa.Column("tone", sa.String(length=100), nullable=True),
        sa.Column("language_patterns", sa.JSON(), nullable=True),
        sa.Column("example_posts", sa.JSON(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_personas_id"), "personas", ["id"], unique=False)

    # Create content_strategies table
    op.create_table(
        "content_strategies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("content_pillars", sa.JSON(), nullable=True),
        sa.Column("hashtag_groups", sa.JSON(), nullable=True),
        sa.Column(
            "posting_frequency",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
        sa.Column("optimal_posting_times", sa.JSON(), nullable=True),
        sa.Column(
            "impression_target",
            sa.Integer(),
            nullable=False,
            server_default="10000",
        ),
        sa.Column(
            "follower_growth_target",
            sa.Integer(),
            nullable=False,
            server_default="5000",
        ),
        sa.Column(
            "engagement_rate_target",
            sa.Float(),
            nullable=False,
            server_default="3.0",
        ),
        sa.Column("content_mix", sa.JSON(), nullable=True),
        sa.Column("avoid_topics", sa.JSON(), nullable=True),
        sa.Column("competitor_accounts", sa.JSON(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="0"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_content_strategies_id"),
        "content_strategies",
        ["id"],
        unique=False,
    )

    # Add new columns to posts table
    op.add_column(
        "posts",
        sa.Column(
            "post_format",
            sa.Enum("tweet", "long_form", "thread", name="postformat"),
            nullable=False,
            server_default="tweet",
        ),
    )
    op.add_column(
        "posts",
        sa.Column("predicted_impressions", sa.Integer(), nullable=True),
    )
    op.add_column(
        "posts",
        sa.Column("persona_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_posts_persona_id",
        "posts",
        "personas",
        ["persona_id"],
        ["id"],
    )

    # Create thread_posts table
    op.create_table(
        "thread_posts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("parent_post_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("thread_order", sa.Integer(), nullable=False),
        sa.Column("x_tweet_id", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["parent_post_id"], ["posts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_thread_posts_id"), "thread_posts", ["id"], unique=False
    )

    # Create impression_predictions table
    op.create_table(
        "impression_predictions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=True),
        sa.Column("content_preview", sa.Text(), nullable=False),
        sa.Column(
            "post_format",
            sa.Enum("tweet", "long_form", "thread", name="postformat"),
            nullable=False,
            server_default="tweet",
        ),
        sa.Column("predicted_impressions", sa.Integer(), nullable=False),
        sa.Column(
            "predicted_likes",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "predicted_retweets",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "confidence_score",
            sa.Float(),
            nullable=False,
            server_default="0.5",
        ),
        sa.Column("actual_impressions", sa.Integer(), nullable=True),
        sa.Column("factors", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_impression_predictions_id"),
        "impression_predictions",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_impression_predictions_id"),
        table_name="impression_predictions",
    )
    op.drop_table("impression_predictions")

    op.drop_index(op.f("ix_thread_posts_id"), table_name="thread_posts")
    op.drop_table("thread_posts")

    op.drop_constraint("fk_posts_persona_id", "posts", type_="foreignkey")
    op.drop_column("posts", "persona_id")
    op.drop_column("posts", "predicted_impressions")
    op.drop_column("posts", "post_format")

    op.drop_index(
        op.f("ix_content_strategies_id"), table_name="content_strategies"
    )
    op.drop_table("content_strategies")

    op.drop_index(op.f("ix_personas_id"), table_name="personas")
    op.drop_table("personas")
