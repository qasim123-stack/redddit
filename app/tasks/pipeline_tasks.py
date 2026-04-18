"""Pipeline orchestration tasks for automated workflows"""

from celery import chain, group
from app.core.celery_app import celery_app
from app.database import engine
from app.models import Profile, RedditPost
from sqlmodel import Session, select, func
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="process_new_profile")
def process_new_profile_task(profile_id: int):
    """
    Full pipeline when a new profile is created.

    Steps:
    1. Fetch posts from ALL configured subreddits
    2. Wait for fetches to complete
    3. Trigger AI analysis on all fetched posts

    Args:
        profile_id: The newly created profile ID
    """
    from app.tasks.reddit_tasks import fetch_hot_posts_task
    from app.tasks.ai_tasks import analyze_profile_posts_task

    with Session(engine) as db:
        profile = db.exec(
            select(Profile).where(Profile.id == profile_id)
        ).first()

        if not profile:
            logger.error(f"Profile {profile_id} not found")
            return {"status": "error", "message": "Profile not found"}

        if not profile.subreddits:
            logger.warning(f"Profile {profile_id} has no subreddits configured")
            return {"status": "skipped", "message": "No subreddits configured"}

        logger.info(
            f"Starting pipeline for profile {profile_id}: "
            f"{len(profile.subreddits)} subreddits"
        )

        # Step 1: Queue fetch tasks for ALL subreddits
        fetch_task_ids = []
        for subreddit in profile.subreddits:
            task = fetch_hot_posts_task.delay(
                subreddit_name=subreddit,
                user_id=profile.user_id,
                profile_id=profile.id,
                limit=profile.fetch_limit_per_subreddit or 100
            )
            fetch_task_ids.append(task.id)
            logger.info(f"Queued fetch for r/{subreddit} (task: {task.id})")

        # Step 2: Queue analysis to run after fetches complete
        # Using countdown to give fetches time to complete
        analysis_delay = len(profile.subreddits) * 30  # 30 sec per subreddit
        analysis_task = analyze_profile_posts_task.apply_async(
            args=[profile_id],
            countdown=analysis_delay
        )

        # Step 3: Queue crisis + trend detection after analysis has time to finish
        from app.tasks.crisis_tasks import detect_crisis_for_profile_task
        from app.tasks.trend_tasks import detect_trends_for_profile_task

        post_analysis_delay = analysis_delay + 60  # 60s buffer after analysis

        crisis_task = detect_crisis_for_profile_task.apply_async(
            args=[profile_id],
            countdown=post_analysis_delay
        )
        trend_task = detect_trends_for_profile_task.apply_async(
            args=[profile_id],
            countdown=post_analysis_delay + 10  # slight offset after crisis
        )

        logger.info(
            f"Pipeline started for profile {profile_id}: "
            f"{len(fetch_task_ids)} fetch tasks, "
            f"analysis in {analysis_delay}s, "
            f"crisis+trend detection in {post_analysis_delay}s"
        )

        return {
            "status": "pipeline_started",
            "profile_id": profile_id,
            "profile_name": profile.name,
            "subreddits": profile.subreddits,
            "fetch_task_ids": fetch_task_ids,
            "analysis_task_id": analysis_task.id,
            "analysis_delay_seconds": analysis_delay,
            "crisis_task_id": crisis_task.id,
            "trend_task_id": trend_task.id,
            "post_analysis_delay_seconds": post_analysis_delay,
        }


@celery_app.task(name="refresh_profile")
def refresh_profile_task(profile_id: int, analyze: bool = True):
    """
    Refresh a profile: fetch new posts and optionally analyze them.

    Use this for scheduled refreshes or manual "Refresh" button.

    Args:
        profile_id: Profile to refresh
        analyze: Whether to run AI analysis after fetching
    """
    from app.tasks.reddit_tasks import fetch_hot_posts_task
    from app.tasks.ai_tasks import analyze_profile_posts_task

    with Session(engine) as db:
        profile = db.exec(
            select(Profile).where(Profile.id == profile_id)
        ).first()

        if not profile:
            return {"status": "error", "message": "Profile not found"}

        if not profile.is_active:
            return {"status": "skipped", "message": "Profile is inactive"}

        if not profile.subreddits:
            return {"status": "skipped", "message": "No subreddits configured"}

        # Fetch from all subreddits
        fetch_task_ids = []
        for subreddit in profile.subreddits:
            task = fetch_hot_posts_task.delay(
                subreddit_name=subreddit,
                user_id=profile.user_id,
                profile_id=profile.id,
                limit=profile.fetch_limit_per_subreddit or 100
            )
            fetch_task_ids.append(task.id)

        result = {
            "status": "refresh_started",
            "profile_id": profile_id,
            "subreddits_count": len(profile.subreddits),
            "fetch_task_ids": fetch_task_ids,
        }

        # Queue analysis if requested
        if analyze:
            analysis_delay = len(profile.subreddits) * 30
            analysis_task = analyze_profile_posts_task.apply_async(
                args=[profile_id],
                countdown=analysis_delay
            )
            result["analysis_task_id"] = analysis_task.id
            result["analysis_delay_seconds"] = analysis_delay

            # Queue crisis + trend detection after analysis completes
            from app.tasks.crisis_tasks import detect_crisis_for_profile_task
            from app.tasks.trend_tasks import detect_trends_for_profile_task

            post_analysis_delay = analysis_delay + 60

            crisis_task = detect_crisis_for_profile_task.apply_async(
                args=[profile_id],
                countdown=post_analysis_delay
            )
            trend_task = detect_trends_for_profile_task.apply_async(
                args=[profile_id],
                countdown=post_analysis_delay + 10
            )
            result["crisis_task_id"] = crisis_task.id
            result["trend_task_id"] = trend_task.id
            result["post_analysis_delay_seconds"] = post_analysis_delay

        return result


@celery_app.task(name="refresh_all_active_profiles")
def refresh_all_active_profiles_task():
    """
    Refresh ALL active profiles.

    Use this for scheduled cron job (e.g., every hour).
    """
    with Session(engine) as db:
        profiles = db.exec(
            select(Profile).where(Profile.is_active == True)
        ).all()

        if not profiles:
            return {"status": "no_active_profiles", "count": 0}

        task_ids = []
        for profile in profiles:
            task = refresh_profile_task.delay(profile.id, analyze=True)
            task_ids.append({"profile_id": profile.id, "task_id": task.id})

        logger.info(f"Queued refresh for {len(profiles)} active profiles")

        return {
            "status": "refresh_queued",
            "profiles_count": len(profiles),
            "tasks": task_ids
        }


@celery_app.task(name="full_analysis_pipeline")
def full_analysis_pipeline_task(profile_id: int):
    """
    Run complete analysis pipeline on existing posts.

    Steps:
    1. Analyze all pending posts
    2. Check for crisis alerts (TODO)
    3. Update trends (TODO)
    4. Send notifications if needed (TODO)

    Args:
        profile_id: Profile to analyze
    """
    from app.tasks.ai_tasks import analyze_profile_posts_task

    with Session(engine) as db:
        profile = db.exec(
            select(Profile).where(Profile.id == profile_id)
        ).first()

        if not profile:
            return {"status": "error", "message": "Profile not found"}

        # Count pending posts
        pending_count = db.exec(
            select(func.count(RedditPost.id)).where(
                RedditPost.profile_id == profile_id,
                RedditPost.processing_status == "pending"
            )
        ).one()

        if pending_count == 0:
            return {
                "status": "no_pending_posts",
                "profile_id": profile_id,
                "message": "All posts already analyzed"
            }

        # Trigger analysis
        analysis_task = analyze_profile_posts_task.delay(profile_id)

        # Queue crisis + trend detection after analysis finishes
        from app.tasks.crisis_tasks import detect_crisis_for_profile_task
        from app.tasks.trend_tasks import detect_trends_for_profile_task

        crisis_task = detect_crisis_for_profile_task.apply_async(
            args=[profile_id], countdown=60
        )
        trend_task = detect_trends_for_profile_task.apply_async(
            args=[profile_id], countdown=70
        )

        return {
            "status": "analysis_started",
            "profile_id": profile_id,
            "pending_posts": pending_count,
            "analysis_task_id": analysis_task.id,
            "crisis_task_id": crisis_task.id,
            "trend_task_id": trend_task.id,
        }
