"""API endpoints for Reddit posts"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Post, Comment
from app.schemas import PostResponse, PostWithComments, CommentResponse
from datetime import datetime, timedelta

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("/", response_model=List[PostResponse])
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
    query = db.query(Post)

    # Apply filters
    if subreddit:
        query = query.filter(Post.subreddit == subreddit)

    if min_score:
        query = query.filter(Post.score >= min_score)

    if hours_ago:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_ago)
        query = query.filter(Post.created_utc >= cutoff_time)

    # Execute query
    posts = query.order_by(Post.created_utc.desc()).limit(limit).offset(offset).all()

    return posts


@router.get("/{post_id}", response_model=PostWithComments)
def get_post_by_id(post_id: str, db: Session = Depends(get_db)):
    """
    Get a specific post by Reddit ID with all its comments

    - **post_id**: Reddit post ID (e.g., "1oq33k6")
    """
    # Find post
    post = db.query(Post).filter(Post.reddit_id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")

    # Get all comments for this post
    comments = db.query(Comment).filter(Comment.link_id == f"t3_{post_id}").all()

    # Build comment tree
    comment_dict = {c.reddit_id: c for c in comments}
    comment_tree = []

    for comment in comments:
        comment_data = CommentResponse.from_orm(comment)

        # If it's a top-level comment (parent is the post)
        if comment.parent_id == f"t3_{post_id}":
            comment_tree.append(comment_data)
        else:
            # Find parent comment and add as reply
            parent_id = comment.parent_id.replace("t1_", "")
            if parent_id in comment_dict:
                parent_comment = next(
                    (c for c in comment_tree if c.reddit_id == parent_id),
                    None
                )
                if parent_comment:
                    parent_comment.replies.append(comment_data)

    # Attach comments to post
    post_response = PostWithComments.from_orm(post)
    post_response.comments = comment_tree

    return post_response


@router.get("/{post_id}/comments", response_model=List[CommentResponse])
def get_post_comments(
    post_id: str,
    limit: int = Query(100, ge=1, le=500),
    min_score: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get all comments for a specific post

    - **post_id**: Reddit post ID
    - **limit**: Number of comments to return
    - **min_score**: Minimum score filter
    """
    # Verify post exists
    post = db.query(Post).filter(Post.reddit_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")

    # Query comments
    query = db.query(Comment).filter(Comment.link_id == f"t3_{post_id}")

    if min_score:
        query = query.filter(Comment.score >= min_score)

    comments = query.order_by(Comment.depth, Comment.created_utc).limit(limit).all()

    return comments


@router.get("/subreddit/{subreddit_name}", response_model=List[PostResponse])
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
    posts = (
        db.query(Post)
        .filter(Post.subreddit == subreddit_name)
        .order_by(Post.created_utc.desc())
        .limit(limit)
        .all()
    )

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

    Returns counts of posts, comments, and subreddits being tracked
    """
    total_posts = db.query(Post).count()
    total_comments = db.query(Comment).count()

    # Get unique subreddits
    subreddits = db.query(Post.subreddit).distinct().all()
    subreddit_list = [s[0] for s in subreddits]

    # Top posts by score
    top_posts = (
        db.query(Post)
        .order_by(Post.score.desc())
        .limit(5)
        .all()
    )

    return {
        "total_posts": total_posts,
        "total_comments": total_comments,
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
