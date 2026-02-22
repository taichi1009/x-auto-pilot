import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Post, PostStatus, PostType
from app.schemas.schemas import PostCreate, PostUpdate
from app.services.x_api import XApiService

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds


class PostService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.x_api = XApiService()

    def create_post(self, data: PostCreate) -> Post:
        post = Post(
            content=data.content,
            status=PostStatus(data.status) if data.status else PostStatus.draft,
            post_type=PostType(data.post_type) if data.post_type else PostType.original,
            schedule_id=data.schedule_id,
        )
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        logger.info("Created post id=%d", post.id)
        return post

    def get_posts(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        post_type: Optional[str] = None,
    ) -> Tuple[List[Post], int]:
        query = self.db.query(Post)
        if status:
            query = query.filter(Post.status == PostStatus(status))
        if post_type:
            query = query.filter(Post.post_type == PostType(post_type))
        total = query.count()
        posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()
        return posts, total

    def get_post(self, post_id: int) -> Post:
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail=f"Post {post_id} not found.")
        return post

    def update_post(self, post_id: int, data: PostUpdate) -> Post:
        post = self.get_post(post_id)
        update_data = data.model_dump(exclude_unset=True)
        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = PostStatus(update_data["status"])
        if "post_type" in update_data and update_data["post_type"] is not None:
            update_data["post_type"] = PostType(update_data["post_type"])
        for field, value in update_data.items():
            setattr(post, field, value)
        self.db.commit()
        self.db.refresh(post)
        logger.info("Updated post id=%d", post.id)
        return post

    def delete_post(self, post_id: int) -> bool:
        post = self.get_post(post_id)
        if post.status == PostStatus.posted:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a post that has already been published.",
            )
        self.db.delete(post)
        self.db.commit()
        logger.info("Deleted post id=%d", post_id)
        return True

    def publish_post(self, post_id: int) -> Post:
        post = self.get_post(post_id)
        if post.status == PostStatus.posted:
            raise HTTPException(
                status_code=400, detail="Post has already been published."
            )
        if len(post.content) > 280:
            raise HTTPException(
                status_code=400,
                detail="Post content exceeds 280 characters.",
            )
        return self._attempt_publish(post)

    def _attempt_publish(self, post: Post) -> Post:
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                tweet_id = self.x_api.post_tweet(post.content)
                post.x_tweet_id = tweet_id
                post.status = PostStatus.posted
                post.posted_at = datetime.utcnow()
                post.retry_count = attempt
                self.db.commit()
                self.db.refresh(post)
                logger.info(
                    "Published post id=%d, tweet_id=%s (attempt %d)",
                    post.id,
                    tweet_id,
                    attempt + 1,
                )
                return post
            except HTTPException as exc:
                last_error = exc
                post.retry_count = attempt + 1
                self.db.commit()
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Publish attempt %d failed for post %d, retrying in %ds: %s",
                        attempt + 1,
                        post.id,
                        delay,
                        exc.detail,
                    )
                    import time
                    time.sleep(delay)

        post.status = PostStatus.failed
        self.db.commit()
        self.db.refresh(post)
        logger.error(
            "Failed to publish post id=%d after %d attempts", post.id, MAX_RETRIES
        )
        raise HTTPException(
            status_code=502,
            detail=f"Failed to publish after {MAX_RETRIES} attempts: {last_error.detail if last_error else 'Unknown error'}",
        )
