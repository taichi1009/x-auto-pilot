from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import PostCreate, PostUpdate, PostResponse
from app.services.post_service import PostService
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/posts", tags=["posts"])


@router.get("", response_model=List[PostResponse])
def list_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    post_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    posts, total = service.get_posts(
        skip=skip, limit=limit, status=status, post_type=post_type,
        user_id=current_user.id,
    )
    return posts


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    return service.get_post(post_id, user_id=current_user.id)


@router.post("", response_model=PostResponse, status_code=201)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    return service.create_post(data, user_id=current_user.id)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    return service.update_post(post_id, data, user_id=current_user.id)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    service.delete_post(post_id, user_id=current_user.id)
    return {"detail": "Post deleted successfully."}


@router.post("/{post_id}/publish", response_model=PostResponse)
def publish_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PostService(db, user_id=current_user.id)
    return service.publish_post(post_id, user_id=current_user.id)


# --- Admin endpoints ---


@router.get("/admin/{user_id}", response_model=List[PostResponse])
def admin_list_posts(
    user_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    post_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PostService(db, user_id=user_id)
    posts, total = service.get_posts(
        skip=skip, limit=limit, status=status, post_type=post_type,
        user_id=user_id,
    )
    return posts


@router.post("/admin/{user_id}", response_model=PostResponse, status_code=201)
def admin_create_post(
    user_id: int,
    data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PostService(db, user_id=user_id)
    return service.create_post(data, user_id=user_id)


@router.put("/admin/{user_id}/{post_id}", response_model=PostResponse)
def admin_update_post(
    user_id: int,
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PostService(db, user_id=user_id)
    return service.update_post(post_id, data, user_id=user_id)


@router.delete("/admin/{user_id}/{post_id}")
def admin_delete_post(
    user_id: int,
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PostService(db, user_id=user_id)
    service.delete_post(post_id, user_id=user_id)
    return {"detail": "Post deleted successfully."}


@router.post("/admin/{user_id}/{post_id}/publish", response_model=PostResponse)
def admin_publish_post(
    user_id: int,
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = PostService(db, user_id=user_id)
    return service.publish_post(post_id, user_id=user_id)
