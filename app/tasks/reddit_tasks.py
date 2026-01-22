"""Celery tasks for Reddit monitoring"""

from app.core.celery_app import celery_app
from app.services.reddit_monitor import RedditMonitor
from app.database import engine
from app.models import RedditPost
from sqlmodel import Session, select
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="fetch_hot_posts")
def fetch_hot_posts_task(subreddit_name: str, limit: int = 25, profile_id: int = None, user_id: int = None):
    """
    Celery task to fetch hot posts from a subreddit and save to database

    Args:
        subreddit_name: Subreddit to fetch from
        limit: Number of posts to fetch
        profile_id: Optional profile ID for monitoring config
        user_id: Optional user ID who triggered this fetch
    """
    monitor = RedditMonitor()

    with Session(engine) as db:
        try:
            posts_data = monitor.fetch_hot_posts(subreddit_name, limit)
            saved_count = 0
            updated_count = 0

            for post_data in posts_data:
                try:
                    # Check if post already exists
                    statement = select(RedditPost).where(RedditPost.reddit_id == post_data["reddit_id"])
                    existing = db.exec(statement).first()

                    if existing:
                        # Update existing post with new data
                        existing.score = post_data["score"]
                        existing.num_comments = post_data["num_comments"]
                        existing.upvote_ratio = post_data.get("upvote_ratio")
                        db.add(existing)
                        updated_count += 1
                        logger.info(f"Updated post: {post_data['reddit_id']}")
                    else:
                        # Create new post - map only fields that exist in RedditPost model
                        post = RedditPost(
                            reddit_id=post_data["reddit_id"],
                            subreddit=post_data["subreddit"],
                            author=post_data.get("author"),
                            title=post_data.get("title"),
                            selftext=post_data.get("selftext"),
                            url=post_data.get("url"),
                            permalink=post_data.get("permalink"),
                            score=post_data.get("score", 0),
                            upvote_ratio=post_data.get("upvote_ratio"),
                            num_comments=post_data.get("num_comments", 0),
                            created_utc=post_data["created_utc"],
                            processing_status="pending",
                            is_relevant=True,
                            is_archived=False,
                            profile_id=profile_id or 1,  # TODO: Use actual profile_id
                            user_id=user_id or 1,  # TODO: Use actual user_id
                            fetched_at=datetime.utcnow(),
                        )
                        db.add(post)
                        saved_count += 1
                        logger.info(f"Saved new post: {post_data['reddit_id']}")

                    db.commit()

                except Exception as e:
                    db.rollback()
                    logger.warning(f"Error saving post {post_data.get('reddit_id')}: {e}")
                    continue

            logger.info(f"Task completed: {saved_count} new, {updated_count} updated from r/{subreddit_name}")
            return {
                "subreddit": subreddit_name,
                "new_posts": saved_count,
                "updated_posts": updated_count,
                "total_fetched": len(posts_data)
            }

        except Exception as e:
            logger.error(f"Error in fetch_hot_posts_task: {e}")
            raise


@celery_app.task(name="fetch_post_comments")
def fetch_post_comments_task(post_id: str, profile_id: int = None, user_id: int = None):
    """
    Celery task to fetch a specific post and update its comment count
    Note: Comment storage not implemented in current schema

    Args:
        post_id: Reddit post ID
        profile_id: Optional profile ID
        user_id: Optional user ID
    """
    monitor = RedditMonitor()

    with Session(engine) as db:
        try:
            result = monitor.fetch_post_with_comments(post_id)
            post_data = result["post"]
            comments_count = len(result["comments"])

            # Check if post exists
            statement = select(RedditPost).where(RedditPost.reddit_id == post_data["reddit_id"])
            existing_post = db.exec(statement).first()

            if not existing_post:
                # Create new post
                post = RedditPost(
                    reddit_id=post_data["reddit_id"],
                    subreddit=post_data["subreddit"],
                    author=post_data.get("author"),
                    title=post_data.get("title"),
                    selftext=post_data.get("selftext"),
                    url=post_data.get("url"),
                    permalink=post_data.get("permalink"),
                    score=post_data.get("score", 0),
                    upvote_ratio=post_data.get("upvote_ratio"),
                    num_comments=comments_count,
                    created_utc=post_data["created_utc"],
                    processing_status="pending",
                    is_relevant=True,
                    is_archived=False,
                    profile_id=profile_id or 1,
                    user_id=user_id or 1,
                    fetched_at=datetime.utcnow(),
                )
                db.add(post)
                db.commit()
                logger.info(f"Saved new post: {post_id}")
            else:
                # Update comment count
                existing_post.num_comments = comments_count
                existing_post.score = post_data.get("score", existing_post.score)
                db.add(existing_post)
                db.commit()
                logger.info(f"Updated post {post_id} with {comments_count} comments")

            return {
                "post_id": post_id,
                "comments_count": comments_count,
                "status": "updated" if existing_post else "created"
            }

        except Exception as e:
            logger.error(f"Error in fetch_post_comments_task: {e}")
            raise


@celery_app.task(name="monitor_subreddit_stream")
def monitor_subreddit_stream(subreddit_name: str, duration_minutes: int = 60, profile_id: int = None, user_id: int = None):
    """
    Celery task to monitor a subreddit stream for a specified duration

    Args:
        subreddit_name: Subreddit to monitor
        duration_minutes: How long to monitor (in minutes)
        profile_id: Optional profile ID
        user_id: Optional user ID
    """
    monitor = RedditMonitor()

    import time
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)

    posts_saved = 0

    with Session(engine) as db:
        try:
            logger.info(f"Starting stream monitoring for r/{subreddit_name} for {duration_minutes} minutes")

            # This is a simplified version - in production, you'd use threading or async
            for submission_data in monitor.stream_submissions(subreddit_name):
                if time.time() > end_time:
                    break

                try:
                    # Check if post already exists
                    statement = select(RedditPost).where(RedditPost.reddit_id == submission_data["reddit_id"])
                    existing = db.exec(statement).first()

                    if not existing:
                        post = RedditPost(
                            reddit_id=submission_data["reddit_id"],
                            subreddit=submission_data["subreddit"],
                            author=submission_data.get("author"),
                            title=submission_data.get("title"),
                            selftext=submission_data.get("selftext"),
                            url=submission_data.get("url"),
                            permalink=submission_data.get("permalink"),
                            score=submission_data.get("score", 0),
                            upvote_ratio=submission_data.get("upvote_ratio"),
                            num_comments=submission_data.get("num_comments", 0),
                            created_utc=submission_data["created_utc"],
                            processing_status="pending",
                            is_relevant=True,
                            is_archived=False,
                            profile_id=profile_id or 1,
                            user_id=user_id or 1,
                            fetched_at=datetime.utcnow(),
                        )
                        db.add(post)
                        db.commit()
                        posts_saved += 1
                        logger.info(f"Streamed new post: {submission_data['reddit_id']}")
                except Exception as e:
                    db.rollback()
                    logger.warning(f"Error streaming post: {e}")
                    continue

            logger.info(f"Stream monitoring completed: {posts_saved} posts saved")
            return {
                "subreddit": subreddit_name,
                "duration_minutes": duration_minutes,
                "posts_saved": posts_saved,
            }

        except Exception as e:
            logger.error(f"Error in monitor_subreddit_stream: {e}")
            raise
