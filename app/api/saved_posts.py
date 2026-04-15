"""Saved Posts API — bookmark Reddit posts for later review"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime

from app.database import get_db
from app.models.models import SavedPost, RedditPost, RedditPostRead
from app.core.security import get_current_user_with_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/saved-posts", tags=["Saved Posts"])


# ── Helper: build enriched saved post response ─────────────────────────────
def _build_response(saved: SavedPost, post: RedditPost) -> dict:
    return {
        "id":       saved.id,
        "user_id":  saved.user_id,
        "post_id":  saved.post_id,
        "note":     saved.note,
        "saved_at": saved.saved_at.isoformat(),
        "post": {
            "id":                post.id,
            "reddit_id":         post.reddit_id,
            "subreddit":         post.subreddit,
            "author":            post.author,
            "title":             post.title,
            "selftext":          post.selftext,
            "url":               post.url,
            "permalink":         post.permalink,
            "score":             post.score,
            "upvote_ratio":      float(post.upvote_ratio) if post.upvote_ratio else None,
            "num_comments":      post.num_comments,
            "created_utc":       post.created_utc.isoformat(),
            "processing_status": post.processing_status,
            "matched_keywords":  post.matched_keywords,
            "is_relevant":       post.is_relevant,
            "is_archived":       post.is_archived,
            "profile_id":        post.profile_id,
            "user_id":           post.user_id,
            "fetched_at":        post.fetched_at.isoformat(),
            "processed_at":      post.processed_at.isoformat() if post.processed_at else None,
        },
    }


# ── List saved posts ────────────────────────────────────────────────────────
@router.get("/")
def list_saved_posts(
    limit:  int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Return all posts saved by the current user, newest first."""
    saved_list = db.exec(
        select(SavedPost)
        .where(SavedPost.user_id == current_user_id)
        .order_by(SavedPost.saved_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    results = []
    for saved in saved_list:
        post = db.exec(select(RedditPost).where(RedditPost.id == saved.post_id)).first()
        if post:
            results.append(_build_response(saved, post))
    return results


# ── Save a post ─────────────────────────────────────────────────────────────
@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
def save_post(
    post_id: int,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Bookmark a Reddit post. Idempotent — saving twice just updates the note."""
    post = db.exec(select(RedditPost).where(RedditPost.id == post_id)).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.exec(
        select(SavedPost).where(
            SavedPost.user_id == current_user_id,
            SavedPost.post_id == post_id,
        )
    ).first()

    if existing:
        if note is not None:
            existing.note = note
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return _build_response(existing, post)

    saved = SavedPost(user_id=current_user_id, post_id=post_id, note=note)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return _build_response(saved, post)


# ── Unsave a post ───────────────────────────────────────────────────────────
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Remove a post from saved list."""
    saved = db.exec(
        select(SavedPost).where(
            SavedPost.user_id == current_user_id,
            SavedPost.post_id == post_id,
        )
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved post not found")
    db.delete(saved)
    db.commit()


# ── Check if a post is saved ────────────────────────────────────────────────
@router.get("/{post_id}/status")
def check_saved_status(
    post_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Returns whether the current user has saved this post."""
    saved = db.exec(
        select(SavedPost).where(
            SavedPost.user_id == current_user_id,
            SavedPost.post_id == post_id,
        )
    ).first()
    return {"post_id": post_id, "is_saved": saved is not None}
