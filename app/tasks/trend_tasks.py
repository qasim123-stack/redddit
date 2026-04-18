"""Trend Detection Celery Tasks"""

from app.core.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(
    name="detect_trends_for_profile",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def detect_trends_for_profile_task(self, profile_id: int):
    """
    Run trend detection for a single profile.

    Compares current 24h topic/keyword activity against the previous 24h.
    Creates Trend records for topics with significant growth.

    Args:
        profile_id: Profile to check
    """
    try:
        from app.services.trend_detector import detect_trends_for_profile

        logger.info(f"Running trend detection for profile {profile_id}")
        result = detect_trends_for_profile(profile_id)

        if result.get("total_trends_created", 0) > 0:
            logger.info(
                f"Profile {profile_id}: {result['total_trends_created']} new trends detected"
            )
        else:
            logger.info(f"Profile {profile_id}: no new trends")

        return result

    except Exception as exc:
        logger.exception(f"Trend detection failed for profile {profile_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="detect_trends_all_active_profiles")
def detect_trends_all_active_profiles_task():
    """
    Run trend detection across ALL active profiles.

    Scheduled by Celery Beat (default: every hour at :15 past).
    Each profile is checked independently.
    """
    from app.database import engine
    from app.models import Profile
    from sqlmodel import Session, select

    with Session(engine) as db:
        profiles = db.exec(
            select(Profile).where(Profile.is_active == True)
        ).all()

    if not profiles:
        return {"status": "no_active_profiles", "count": 0}

    task_ids = []
    for profile in profiles:
        task = detect_trends_for_profile_task.delay(profile.id)
        task_ids.append({"profile_id": profile.id, "task_id": task.id})

    logger.info(f"Trend detection queued for {len(profiles)} active profiles")

    return {
        "status": "queued",
        "profiles_count": len(profiles),
        "tasks": task_ids,
    }


@celery_app.task(name="smart_refresh_due_profiles")
def smart_refresh_due_profiles_task():
    """
    Smart scheduler: check every profile's polling_frequency_minutes and
    only refresh those that are actually due.

    Scheduled by Celery Beat every 5 minutes.
    This replaces a fixed-interval refresh for all profiles — each profile
    runs on its own schedule based on polling_frequency_minutes.
    """
    from app.database import engine
    from app.models import Profile
    from app.tasks.pipeline_tasks import refresh_profile_task
    from sqlmodel import Session, select
    from datetime import datetime, timedelta

    now = datetime.utcnow()

    with Session(engine) as db:
        profiles = db.exec(
            select(Profile).where(Profile.is_active == True)
        ).all()

    if not profiles:
        return {"status": "no_active_profiles"}

    refreshed = []
    skipped = []

    for profile in profiles:
        freq_minutes = profile.polling_frequency_minutes or 15

        if profile.last_fetch_at is None:
            # Never fetched — run immediately
            refresh_profile_task.delay(profile.id, analyze=True)
            refreshed.append(profile.id)
            logger.info(
                f"Profile {profile.id} ({profile.name}): first fetch triggered"
            )
        else:
            elapsed_minutes = (now - profile.last_fetch_at).total_seconds() / 60
            if elapsed_minutes >= freq_minutes:
                refresh_profile_task.delay(profile.id, analyze=True)
                refreshed.append(profile.id)
                logger.info(
                    f"Profile {profile.id} ({profile.name}): refresh triggered "
                    f"({elapsed_minutes:.0f}m elapsed, freq={freq_minutes}m)"
                )
            else:
                skipped.append(profile.id)

    logger.info(
        f"Smart refresh: {len(refreshed)} refreshed, {len(skipped)} not due yet"
    )

    return {
        "status": "complete",
        "refreshed_profiles": refreshed,
        "skipped_profiles": skipped,
        "checked_at": now.isoformat(),
    }
