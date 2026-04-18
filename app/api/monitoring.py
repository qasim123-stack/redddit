"""API endpoints for controlling Reddit monitoring"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.tasks import fetch_hot_posts_task, fetch_post_comments_task
from app.core.config import settings
from app.core.security import get_current_user_with_db
from app.database import get_db
from app.models import Profile
from sqlmodel import Session, select

router = APIRouter(prefix="/monitor", tags=["Monitoring"])


class FetchPostsRequest(BaseModel):
    """Request schema for fetching posts"""
    subreddit: str
    profile_id: int
    limit: int = 25


class FetchCommentsRequest(BaseModel):
    """Request schema for fetching comments"""
    post_id: str
    profile_id: int


class MonitorResponse(BaseModel):
    """Response schema for monitoring tasks"""
    status: str
    message: str
    task_id: Optional[str] = None


@router.post("/fetch-hot-posts", response_model=MonitorResponse)
def trigger_fetch_hot_posts(
    request: FetchPostsRequest,
    user_id: int = Depends(get_current_user_with_db),
    db: Session = Depends(get_db)
):
    """
    Trigger a Celery task to fetch hot posts from a subreddit

    - **subreddit**: Name of the subreddit to fetch from
    - **profile_id**: Your profile ID
    - **limit**: Number of posts to fetch (default: 25)
    """
    # Verify profile belongs to this user
    profile = db.exec(select(Profile).where(Profile.id == request.profile_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your profile")

    try:
        task = fetch_hot_posts_task.delay(
            subreddit_name=request.subreddit,
            user_id=user_id,
            profile_id=request.profile_id,
            limit=request.limit
        )

        return MonitorResponse(
            status="success",
            message=f"Started fetching {request.limit} hot posts from r/{request.subreddit}",
            task_id=task.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start task: {str(e)}")


@router.post("/fetch-comments", response_model=MonitorResponse)
def trigger_fetch_comments(
    request: FetchCommentsRequest,
    user_id: int = Depends(get_current_user_with_db),
    db: Session = Depends(get_db)
):
    """
    Trigger a Celery task to fetch all comments for a specific post

    - **post_id**: Reddit post ID
    - **profile_id**: Your profile ID
    """
    # Verify profile belongs to this user
    profile = db.exec(select(Profile).where(Profile.id == request.profile_id)).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your profile")

    try:
        task = fetch_post_comments_task.delay(
            post_id=request.post_id,
            user_id=user_id,
            profile_id=request.profile_id
        )

        return MonitorResponse(
            status="success",
            message=f"Started fetching comments for post {request.post_id}",
            task_id=task.id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start task: {str(e)}")


@router.get("/task-status/{task_id}")
def get_task_status(task_id: str):
    """
    Get the status of a Celery task

    - **task_id**: Celery task ID returned from monitoring endpoints
    """
    from app.core.celery_app import celery_app

    task_result = celery_app.AsyncResult(task_id)

    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None,
        "info": task_result.info
    }


@router.get("/monitored-subreddits")
def get_monitored_subreddits():
    """
    Get list of subreddits configured for monitoring

    Returns the list from environment configuration
    """
    return {
        "subreddits": settings.subreddit_list,
        "count": len(settings.subreddit_list)
    }


@router.post("/bulk-fetch", response_model=List[MonitorResponse])
def bulk_fetch_from_subreddits(subreddits: Optional[List[str]] = None, limit: int = 25):
    """
    Trigger fetching from multiple subreddits at once

    - **subreddits**: List of subreddit names (if None, uses configured subreddits)
    - **limit**: Number of posts per subreddit
    """
    target_subreddits = subreddits or settings.subreddit_list

    if not target_subreddits:
        raise HTTPException(status_code=400, detail="No subreddits specified")

    responses = []

    for subreddit in target_subreddits:
        try:
            task = fetch_hot_posts_task.delay(subreddit, limit)
            responses.append(
                MonitorResponse(
                    status="success",
                    message=f"Started fetching from r/{subreddit}",
                    task_id=task.id
                )
            )
        except Exception as e:
            responses.append(
                MonitorResponse(
                    status="error",
                    message=f"Failed to start task for r/{subreddit}: {str(e)}",
                    task_id=None
                )
            )

    return responses
