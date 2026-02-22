import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Post, PostStatus, PostType, PostFormat, ThreadPost
from app.schemas.schemas import PostCreate, PostUpdate
from app.services.x_api import XApiService

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_BASE_DELAY = 2  # seconds


class PostService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.x_api = XApiService()

    def create_post(self, data: PostCreate, user_id: Optional[int] = None) -> Post:
        post = Post(
            content=data.content,
            status=PostStatus(data.status) if data.status else PostStatus.draft,
            post_type=PostType(data.post_type) if data.post_type else PostType.original,
            post_format=PostFormat(data.post_format) if data.post_format else PostFormat.tweet,
            persona_id=data.persona_id,
            schedule_id=data.schedule_id,
        )
        post.user_id = user_id
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)

        # Create thread posts if format is thread
        if data.thread_contents and data.post_format == "thread":
            for idx, thread_content in enumerate(data.thread_contents):
                thread_post = ThreadPost(
                    parent_post_id=post.id,
                    content=thread_content,
                    thread_order=idx + 1,
                )
                self.db.add(thread_post)
            self.db.commit()
            self.db.refresh(post)

        logger.info("Created post id=%d format=%s", post.id, post.post_format.value)
        return post

    def get_posts(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        post_type: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Tuple[List[Post], int]:
        query = self.db.query(Post)
        if user_id is not None:
            query = query.filter(Post.user_id == user_id)
        if status:
            query = query.filter(Post.status == PostStatus(status))
        if post_type:
            query = query.filter(Post.post_type == PostType(post_type))
        total = query.count()
        posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()
        return posts, total

    def get_post(self, post_id: int, user_id: Optional[int] = None) -> Post:
        query = self.db.query(Post).filter(Post.id == post_id)
        if user_id is not None:
            query = query.filter(Post.user_id == user_id)
        post = query.first()
        if not post:
            raise HTTPException(status_code=404, detail=f"Post {post_id} not found.")
        return post

    def update_post(self, post_id: int, data: PostUpdate, user_id: Optional[int] = None) -> Post:
        post = self.get_post(post_id, user_id=user_id)
        update_data = data.model_dump(exclude_unset=True)
        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = PostStatus(update_data["status"])
        if "post_type" in update_data and update_data["post_type"] is not None:
            update_data["post_type"] = PostType(update_data["post_type"])
        if "post_format" in update_data and update_data["post_format"] is not None:
            update_data["post_format"] = PostFormat(update_data["post_format"])

        # Handle thread_contents separately
        thread_contents = update_data.pop("thread_contents", None)

        for field, value in update_data.items():
            setattr(post, field, value)

        # Update thread posts if provided
        if thread_contents is not None:
            # Remove existing thread posts
            for tp in post.thread_posts:
                self.db.delete(tp)
            # Add new ones
            for idx, content in enumerate(thread_contents):
                thread_post = ThreadPost(
                    parent_post_id=post.id,
                    content=content,
                    thread_order=idx + 1,
                )
                self.db.add(thread_post)

        self.db.commit()
        self.db.refresh(post)
        logger.info("Updated post id=%d", post.id)
        return post

    def delete_post(self, post_id: int, user_id: Optional[int] = None) -> bool:
        post = self.get_post(post_id, user_id=user_id)
        if post.status == PostStatus.posted:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a post that has already been published.",
            )
        self.db.delete(post)
        self.db.commit()
        logger.info("Deleted post id=%d", post_id)
        return True

    def publish_post(self, post_id: int, media_ids: Optional[List[str]] = None, user_id: Optional[int] = None) -> Post:
        post = self.get_post(post_id, user_id=user_id)
        if post.status == PostStatus.posted:
            raise HTTPException(
                status_code=400, detail="Post has already been published."
            )
        # Format-specific validation
        fmt = post.post_format if post.post_format else PostFormat.tweet
        if fmt == PostFormat.tweet and len(post.content) > 280:
            raise HTTPException(
                status_code=400,
                detail="Tweet content exceeds 280 characters.",
            )
        if fmt == PostFormat.long_form and len(post.content) > 25000:
            raise HTTPException(
                status_code=400,
                detail="Long-form content exceeds 25,000 characters.",
            )
        if fmt == PostFormat.thread:
            for tp in post.thread_posts:
                if len(tp.content) > 280:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Thread tweet #{tp.thread_order} exceeds 280 characters.",
                    )
        return self._attempt_publish(post, media_ids=media_ids)

    def _attempt_publish(self, post: Post, media_ids: Optional[List[str]] = None) -> Post:
        fmt = post.post_format if post.post_format else PostFormat.tweet
        if fmt == PostFormat.thread and post.thread_posts:
            return self._publish_thread(post)

        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                tweet_id = self.x_api.post_tweet(post.content, media_ids=media_ids)
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

    def _publish_thread(self, post: Post) -> Post:
        """Publish a thread as a reply chain."""
        sorted_tweets = sorted(post.thread_posts, key=lambda t: t.thread_order)
        reply_to_id = None

        for idx, thread_tweet in enumerate(sorted_tweets):
            try:
                tweet_id = self.x_api.post_tweet(
                    thread_tweet.content, reply_to=reply_to_id
                )
                thread_tweet.x_tweet_id = tweet_id
                if idx == 0:
                    post.x_tweet_id = tweet_id
                reply_to_id = tweet_id
                self.db.commit()
            except HTTPException as exc:
                post.status = PostStatus.failed
                self.db.commit()
                self.db.refresh(post)
                logger.error(
                    "Thread publish failed at tweet #%d for post %d: %s",
                    idx + 1, post.id, exc.detail,
                )
                raise

        post.status = PostStatus.posted
        post.posted_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(post)
        logger.info("Published thread post id=%d (%d tweets)", post.id, len(sorted_tweets))
        return post
