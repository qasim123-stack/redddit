"""Celery tasks for AI analysis of Reddit posts"""

from app.core.celery_app import celery_app
from app.database import engine
from app.models import RedditPost, AIAnalysis, Profile
from app.services.ai_analyzer import AIAnalyzer, map_analysis_to_db_fields
from sqlmodel import Session, select
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="analyze_single_post", bind=True, max_retries=3)
def analyze_single_post_task(self, post_id: int):
    """
    Analyze a single Reddit post with GPT-4o-mini.

    Args:
        post_id: Database ID of the RedditPost to analyze
    """
    analyzer = AIAnalyzer()

    with Session(engine) as db:
        try:
            post = db.exec(
                select(RedditPost).where(RedditPost.id == post_id)
            ).first()

            if not post:
                logger.error(f"Post {post_id} not found")
                return {"error": f"Post {post_id} not found"}

            # Skip if already analyzed
            existing = db.exec(
                select(AIAnalysis).where(AIAnalysis.post_id == post_id)
            ).first()
            if existing:
                logger.info(f"Post {post_id} already analyzed, skipping")
                return {"status": "skipped", "post_id": post_id, "reason": "already_analyzed"}

            # Run AI analysis
            raw_result = analyzer.analyze_post(
                title=post.title or "",
                body=post.selftext or "",
                subreddit=post.subreddit or "",
            )

            # Map to database fields
            db_fields = map_analysis_to_db_fields(raw_result)

            # Save to database
            ai_analysis = AIAnalysis(
                post_id=post.id,
                profile_id=post.profile_id,
                analyzed_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **db_fields,
            )
            db.add(ai_analysis)

            # Update post status
            post.processing_status = "analyzed"
            post.processed_at = datetime.utcnow()
            db.add(post)

            # Update profile stats
            profile = db.exec(
                select(Profile).where(Profile.id == post.profile_id)
            ).first()
            if profile:
                profile.total_posts_analyzed += 1
                profile.updated_at = datetime.utcnow()
                db.add(profile)

            db.commit()

            logger.info(
                f"Post {post_id} analyzed: sentiment={db_fields['sentiment_label']}, "
                f"intent={db_fields['intent_label']}, "
                f"pain_point={db_fields['has_pain_point']}"
            )

            return {
                "status": "success",
                "post_id": post_id,
                "sentiment": db_fields["sentiment_label"],
                "intent": db_fields["intent_label"],
                "has_pain_point": db_fields["has_pain_point"],
                "processing_time_ms": db_fields["processing_time_ms"],
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to analyze post {post_id}: {e}")
            # Retry with exponential backoff
            raise self.retry(exc=e, countdown=2 ** self.request.retries)


@celery_app.task(name="analyze_profile_posts", bind=True)
def analyze_profile_posts_task(self, profile_id: int, limit: int = 50):
    """
    Analyze all unanalyzed posts for a profile.

    Args:
        profile_id: Profile ID to analyze posts for
        limit: Max number of posts to analyze in one batch
    """
    with Session(engine) as db:
        try:
            # Get profile
            profile = db.exec(
                select(Profile).where(Profile.id == profile_id)
            ).first()
            if not profile:
                logger.error(f"Profile {profile_id} not found")
                return {"error": f"Profile {profile_id} not found"}

            # Find unanalyzed posts (status = "pending")
            posts = db.exec(
                select(RedditPost)
                .where(
                    RedditPost.profile_id == profile_id,
                    RedditPost.processing_status == "pending",
                )
                .order_by(RedditPost.created_utc.desc())
                .limit(limit)
            ).all()

            if not posts:
                logger.info(f"No unanalyzed posts for profile {profile_id}")
                return {
                    "status": "no_posts",
                    "profile_id": profile_id,
                    "analyzed": 0,
                }

            logger.info(f"Queuing {len(posts)} posts for analysis (profile {profile_id})")

            # Queue each post for individual analysis
            task_ids = []
            for post in posts:
                task = analyze_single_post_task.delay(post.id)
                task_ids.append(task.id)

            return {
                "status": "queued",
                "profile_id": profile_id,
                "posts_queued": len(task_ids),
                "task_ids": task_ids,
            }

        except Exception as e:
            logger.error(f"Failed to queue analysis for profile {profile_id}: {e}")
            raise


@celery_app.task(name="analyze_post_batch")
def analyze_post_batch_task(post_ids: list):
    """
    Analyze a specific batch of posts by their IDs.

    Args:
        post_ids: List of RedditPost database IDs
    """
    analyzer = AIAnalyzer()
    results = {"success": 0, "failed": 0, "skipped": 0, "details": []}

    with Session(engine) as db:
        for post_id in post_ids:
            try:
                post = db.exec(
                    select(RedditPost).where(RedditPost.id == post_id)
                ).first()

                if not post:
                    results["failed"] += 1
                    results["details"].append({"post_id": post_id, "status": "not_found"})
                    continue

                # Skip already analyzed
                existing = db.exec(
                    select(AIAnalysis).where(AIAnalysis.post_id == post_id)
                ).first()
                if existing:
                    results["skipped"] += 1
                    results["details"].append({"post_id": post_id, "status": "skipped"})
                    continue

                # Analyze
                raw_result = analyzer.analyze_post(
                    title=post.title or "",
                    body=post.selftext or "",
                    subreddit=post.subreddit or "",
                )
                db_fields = map_analysis_to_db_fields(raw_result)

                ai_analysis = AIAnalysis(
                    post_id=post.id,
                    profile_id=post.profile_id,
                    analyzed_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    **db_fields,
                )
                db.add(ai_analysis)

                post.processing_status = "analyzed"
                post.processed_at = datetime.utcnow()
                db.add(post)

                # Update profile stats
                profile = db.exec(
                    select(Profile).where(Profile.id == post.profile_id)
                ).first()
                if profile:
                    profile.total_posts_analyzed += 1
                    profile.updated_at = datetime.utcnow()
                    db.add(profile)

                db.commit()

                results["success"] += 1
                results["details"].append({
                    "post_id": post_id,
                    "status": "success",
                    "sentiment": db_fields["sentiment_label"],
                })

            except Exception as e:
                db.rollback()
                results["failed"] += 1
                results["details"].append({
                    "post_id": post_id,
                    "status": "error",
                    "error": str(e),
                })
                logger.error(f"Batch analysis failed for post {post_id}: {e}")

    logger.info(
        f"Batch analysis complete: {results['success']} success, "
        f"{results['failed']} failed, {results['skipped']} skipped"
    )
    return results


@celery_app.task(name="reanalyze_post")
def reanalyze_post_task(post_id: int):
    """
    Re-analyze a post that was previously analyzed. Overwrites old analysis.

    Args:
        post_id: Database ID of the RedditPost
    """
    analyzer = AIAnalyzer()

    with Session(engine) as db:
        try:
            post = db.exec(
                select(RedditPost).where(RedditPost.id == post_id)
            ).first()
            if not post:
                return {"error": f"Post {post_id} not found"}

            # Run fresh analysis
            raw_result = analyzer.analyze_post(
                title=post.title or "",
                body=post.selftext or "",
                subreddit=post.subreddit or "",
            )
            db_fields = map_analysis_to_db_fields(raw_result)

            # Check if analysis exists
            existing = db.exec(
                select(AIAnalysis).where(AIAnalysis.post_id == post_id)
            ).first()

            if existing:
                # Update existing analysis
                for key, value in db_fields.items():
                    setattr(existing, key, value)
                existing.analyzed_at = datetime.utcnow()
                existing.updated_at = datetime.utcnow()
                db.add(existing)
            else:
                # Create new
                ai_analysis = AIAnalysis(
                    post_id=post.id,
                    profile_id=post.profile_id,
                    analyzed_at=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    **db_fields,
                )
                db.add(ai_analysis)

            post.processing_status = "analyzed"
            post.processed_at = datetime.utcnow()
            db.add(post)
            db.commit()

            logger.info(f"Post {post_id} re-analyzed successfully")
            return {"status": "success", "post_id": post_id}

        except Exception as e:
            db.rollback()
            logger.error(f"Re-analysis failed for post {post_id}: {e}")
            raise
