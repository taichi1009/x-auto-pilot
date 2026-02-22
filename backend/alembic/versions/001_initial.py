"""Initial migration - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-02-22 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create templates table (referenced by schedules)
    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("content_pattern", sa.Text(), nullable=False),
        sa.Column("variables", sa.JSON(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
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
    op.create_index(op.f("ix_templates_id"), "templates", ["id"], unique=False)

    # Create schedules table (referenced by posts)
    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "schedule_type",
            sa.Enum("once", "recurring", name="scheduletype"),
            nullable=False,
        ),
        sa.Column("cron_expression", sa.String(length=100), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column(
            "post_type",
            sa.Enum("original", "ai_generated", "template", name="posttype"),
            nullable=False,
            server_default="original",
        ),
        sa.Column("ai_prompt", sa.Text(), nullable=True),
        sa.Column("template_id", sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(["template_id"], ["templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_schedules_id"), "schedules", ["id"], unique=False)

    # Create posts table
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "scheduled", "posted", "failed", name="poststatus"),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "post_type",
            sa.Enum("original", "ai_generated", "template", name="posttype"),
            nullable=False,
            server_default="original",
        ),
        sa.Column("x_tweet_id", sa.String(length=64), nullable=True),
        sa.Column("posted_at", sa.DateTime(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("schedule_id", sa.Integer(), nullable=True),
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
        sa.ForeignKeyConstraint(["schedule_id"], ["schedules.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_posts_id"), "posts", ["id"], unique=False)

    # Create post_analytics table
    op.create_table(
        "post_analytics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("impressions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("likes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("retweets", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("replies", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("quotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bookmarks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("profile_visits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "collected_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
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
        op.f("ix_post_analytics_id"), "post_analytics", ["id"], unique=False
    )

    # Create follow_targets table
    op.create_table(
        "follow_targets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("x_user_id", sa.String(length=64), nullable=False),
        sa.Column("x_username", sa.String(length=255), nullable=False),
        sa.Column(
            "action",
            sa.Enum("follow", "unfollow", name="followaction"),
            nullable=False,
            server_default="follow",
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "completed", "failed", name="followstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("followed_at", sa.DateTime(), nullable=True),
        sa.Column("unfollowed_at", sa.DateTime(), nullable=True),
        sa.Column(
            "follow_back", sa.Boolean(), nullable=False, server_default="0"
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
        sa.UniqueConstraint("x_user_id"),
    )
    op.create_index(
        op.f("ix_follow_targets_id"), "follow_targets", ["id"], unique=False
    )

    # Create app_settings table
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
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
        sa.UniqueConstraint("key"),
    )
    op.create_index(
        op.f("ix_app_settings_id"), "app_settings", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_app_settings_key"), "app_settings", ["key"], unique=True
    )

    # Create pdca_logs table
    op.create_table(
        "pdca_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "analysis_type",
            sa.Enum("weekly", "monthly", name="analysistype"),
            nullable=False,
        ),
        sa.Column("period_start", sa.DateTime(), nullable=False),
        sa.Column("period_end", sa.DateTime(), nullable=False),
        sa.Column("analysis_result", sa.JSON(), nullable=True),
        sa.Column("recommendations", sa.JSON(), nullable=True),
        sa.Column("applied_changes", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pdca_logs_id"), "pdca_logs", ["id"], unique=False)

    # Create api_usage_logs table
    op.create_table(
        "api_usage_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("endpoint", sa.String(length=255), nullable=False),
        sa.Column("method", sa.String(length=10), nullable=False),
        sa.Column("tier_required", sa.String(length=20), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_api_usage_logs_id"), "api_usage_logs", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_api_usage_logs_id"), table_name="api_usage_logs")
    op.drop_table("api_usage_logs")

    op.drop_index(op.f("ix_pdca_logs_id"), table_name="pdca_logs")
    op.drop_table("pdca_logs")

    op.drop_index(op.f("ix_app_settings_key"), table_name="app_settings")
    op.drop_index(op.f("ix_app_settings_id"), table_name="app_settings")
    op.drop_table("app_settings")

    op.drop_index(op.f("ix_follow_targets_id"), table_name="follow_targets")
    op.drop_table("follow_targets")

    op.drop_index(op.f("ix_post_analytics_id"), table_name="post_analytics")
    op.drop_table("post_analytics")

    op.drop_index(op.f("ix_posts_id"), table_name="posts")
    op.drop_table("posts")

    op.drop_index(op.f("ix_schedules_id"), table_name="schedules")
    op.drop_table("schedules")

    op.drop_index(op.f("ix_templates_id"), table_name="templates")
    op.drop_table("templates")
