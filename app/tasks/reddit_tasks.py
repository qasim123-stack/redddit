"""Celery tasks for Reddit monitoring"""

from app.core.celery_app import celery_app
from app.services.reddit_monitor import RedditMonitor
from app.database import SessionLocal
from app.models import Post, Comment
from sqlalchemy.exc import IntegrityError
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="fetch_hot_posts")
def fetch_hot_posts_task(subreddit_name: str, limit: int = 25):
    """
    Celery task to fetch hot posts from a subreddit and save to database

    Args:
        subreddit_name: Subreddit to fetch from
        limit: Number of posts to fetch
    """
    db = SessionLocal()
    monitor = RedditMonitor()

    try:
        posts_data = monitor.fetch_hot_posts(subreddit_name, limit)
        saved_count = 0

        for post_data in posts_data:
            try:
                # Check if post already exists
                existing = db.query(Post).filter(Post.reddit_id == post_data["reddit_id"]).first()

                if existing:
                    # Update existing post
                    for key, value in post_data.items():
                        setattr(existing, key, value)
                    logger.info(f"Updated post: {post_data['reddit_id']}")
                else:
                    # Create new post
                    post = Post(**post_data)
                    db.add(post)
                    saved_count += 1
                    logger.info(f"Saved new post: {post_data['reddit_id']}")

                db.commit()

            except IntegrityError as e:
                db.rollback()
                logger.warning(f"Duplicate post {post_data['reddit_id']}: {e}")
                continue

        logger.info(f"Task completed: {saved_count} new posts saved from r/{subreddit_name}")
        return {"subreddit": subreddit_name, "new_posts": saved_count, "total_fetched": len(posts_data)}

    except Exception as e:
        logger.error(f"Error in fetch_hot_posts_task: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="fetch_post_comments")
def fetch_post_comments_task(post_id: str):
    """
    Celery task to fetch all comments for a specific post

    Args:
        post_id: Reddit post ID
    """
    db = SessionLocal()
    monitor = RedditMonitor()

    try:
        result = monitor.fetch_post_with_comments(post_id)
        post_data = result["post"]
        comments_data = result["comments"]

        # Save/update post
        existing_post = db.query(Post).filter(Post.reddit_id == post_data["reddit_id"]).first()

        if not existing_post:
            post = Post(**post_data)
            db.add(post)
            db.commit()
            logger.info(f"Saved new post: {post_id}")
        else:
            logger.info(f"Post {post_id} already exists")

        # Save comments
        saved_count = 0
        for comment_data in comments_data:
            try:
                existing_comment = db.query(Comment).filter(
                    Comment.reddit_id == comment_data["reddit_id"]
                ).first()

                if existing_comment:
                    # Update existing comment
                    for key, value in comment_data.items():
                        setattr(existing_comment, key, value)
                else:
                    # Create new comment
                    comment = Comment(**comment_data)
                    db.add(comment)
                    saved_count += 1

                db.commit()

            except IntegrityError:
                db.rollback()
                continue

        logger.info(f"Task completed: {saved_count} new comments saved for post {post_id}")
        return {"post_id": post_id, "new_comments": saved_count, "total_fetched": len(comments_data)}

    except Exception as e:
        logger.error(f"Error in fetch_post_comments_task: {e}")
        raise
    finally:
        db.close()


@celery_app.task(name="monitor_subreddit_stream")
def monitor_subreddit_stream(subreddit_name: str, duration_minutes: int = 60):
    """
    Celery task to monitor a subreddit stream for a specified duration

    Args:
        subreddit_name: Subreddit to monitor
        duration_minutes: How long to monitor (in minutes)
    """
    db = SessionLocal()
    monitor = RedditMonitor()

    import time
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)

    posts_saved = 0
    comments_saved = 0

    try:
        logger.info(f"Starting stream monitoring for r/{subreddit_name} for {duration_minutes} minutes")

        # This is a simplified version - in production, you'd use threading or async
        for submission_data in monitor.stream_submissions(subreddit_name):
            if time.time() > end_time:
                break

            try:
                post = Post(**submission_data)
                db.add(post)
                db.commit()
                posts_saved += 1
                logger.info(f"Streamed new post: {submission_data['reddit_id']}")
            except IntegrityError:
                db.rollback()
                continue

        logger.info(f"Stream monitoring completed: {posts_saved} posts, {comments_saved} comments")
        return {
            "subreddit": subreddit_name,
            "duration_minutes": duration_minutes,
            "posts_saved": posts_saved,
            "comments_saved": comments_saved
        }

    except Exception as e:
        logger.error(f"Error in monitor_subreddit_stream: {e}")
        raise
    finally:
        db.close()
