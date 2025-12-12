"""API endpoints for Reddit posts"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_db
from app.models import RedditPost, RedditPostRead, RedditPostCreate
from datetime import datetime, timedelta

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("/", response_model=List[RedditPostRead])
def get_posts(
    subreddit: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    min_score: Optional[int] = None,
    hours_ago: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get posts with optional filtering

    - **subreddit**: Filter by subreddit name
    - **limit**: Number of posts to return (max 100)
    - **offset**: Pagination offset
    - **min_score**: Minimum score filter
    - **hours_ago**: Only posts from last X hours
    """
    # Build query with filters
    statement = select(RedditPost)

    if subreddit:
        statement = statement.where(RedditPost.subreddit == subreddit)

    if min_score:
        statement = statement.where(RedditPost.score >= min_score)

    if hours_ago:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_ago)
        statement = statement.where(RedditPost.created_utc >= cutoff_time)

    # Execute query
    statement = statement.order_by(RedditPost.created_utc.desc()).limit(limit).offset(offset)
    posts = db.exec(statement).all()

    return posts


@router.get("/{post_id}", response_model=RedditPostRead)
def get_post_by_id(post_id: str, db: Session = Depends(get_db)):
    """
    Get a specific post by Reddit ID

    - **post_id**: Reddit post ID (e.g., "1oq33k6")
    """
    statement = select(RedditPost).where(RedditPost.reddit_id == post_id)
    post = db.exec(statement).first()

    if not post:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")

    return post


@router.get("/subreddit/{subreddit_name}", response_model=List[RedditPostRead])
def get_subreddit_posts(
    subreddit_name: str,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get posts from a specific subreddit

    - **subreddit_name**: Name of the subreddit (e.g., "AiAutomations")
    - **limit**: Number of posts to return
    """
    statement = (
        select(RedditPost)
        .where(RedditPost.subreddit == subreddit_name)
        .order_by(RedditPost.created_utc.desc())
        .limit(limit)
    )
    posts = db.exec(statement).all()

    if not posts:
        raise HTTPException(
            status_code=404,
            detail=f"No posts found for r/{subreddit_name}. Try fetching from Reddit first."
        )

    return posts


@router.get("/stats/summary")
def get_stats_summary(db: Session = Depends(get_db)):
    """
    Get database statistics summary

    Returns counts of posts and subreddits being tracked
    """
    # Count total posts
    statement = select(RedditPost)
    total_posts = len(db.exec(statement).all())

    # Get unique subreddits
    statement = select(RedditPost.subreddit).distinct()
    subreddit_list = list(db.exec(statement).all())

    # Top posts by score
    statement = select(RedditPost).order_by(RedditPost.score.desc()).limit(5)
    top_posts = db.exec(statement).all()

    return {
        "total_posts": total_posts,
        "subreddits_tracked": len(subreddit_list),
        "subreddits": subreddit_list,
        "top_posts": [
            {
                "reddit_id": p.reddit_id,
                "title": p.title,
                "score": p.score,
                "subreddit": p.subreddit
            }
            for p in top_posts
        ]
    }
