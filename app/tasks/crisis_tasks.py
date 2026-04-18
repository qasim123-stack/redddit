"""Crisis Detection and Notification Celery Tasks"""

from app.core.celery_app import celery_app
import logging

logger = logging.getLogger(__name__)


@celery_app.task(
    name="detect_crisis_for_profile",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def detect_crisis_for_profile_task(self, profile_id: int):
    """
    Run crisis detection for a single profile.

    Analyzes the last 24h of sentiment data against a 7-day baseline.
    Creates a CrisisAlert record if a negative spike is detected.
    Automatically triggers notification delivery if a crisis is found.

    Args:
        profile_id: Profile to check
    """
    try:
        from app.services.crisis_detector import detect_crisis_for_profile

        logger.info(f"Running crisis detection for profile {profile_id}")
        result = detect_crisis_for_profile(profile_id)

        if result is None:
            return {"status": "no_crisis", "profile_id": profile_id}

        # Crisis detected — trigger notification delivery
        alert_id = result["alert_id"]
        notify_crisis_alert_task.delay(alert_id)

        logger.warning(
            f"Crisis detected for profile {profile_id}: "
            f"alert_id={alert_id}, severity={result['severity']}, "
            f"spike={result['spike_multiplier']}x"
        )

        return {
            "status": "crisis_detected",
            "profile_id": profile_id,
            "alert_id": alert_id,
            "severity": result["severity"],
            "spike_multiplier": result["spike_multiplier"],
        }

    except Exception as exc:
        logger.exception(f"Crisis detection failed for profile {profile_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="notify_crisis_alert",
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def notify_crisis_alert_task(self, alert_id: int):
    """
    Deliver notifications for a CrisisAlert via all configured channels:
    - In-app notification (always)
    - Email (if SMTP configured and user has email enabled)
    - Slack (if SLACK_WEBHOOK_URL configured)

    Args:
        alert_id: The CrisisAlert record ID to notify about
    """
    try:
        from app.services.notification_service import notify_crisis_alert

        logger.info(f"Delivering notifications for CrisisAlert {alert_id}")
        results = notify_crisis_alert(alert_id)

        logger.info(
            f"CrisisAlert {alert_id} notification results: "
            f"in_app={results['in_app']}, email={results['email']}, slack={results['slack']}"
        )

        return {
            "status": "notified",
            "alert_id": alert_id,
            "channels": results,
        }

    except Exception as exc:
        logger.exception(f"Notification delivery failed for alert {alert_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(name="detect_crisis_all_active_profiles")
def detect_crisis_all_active_profiles_task():
    """
    Run crisis detection across ALL active profiles.

    Use this in a scheduled Celery Beat job (e.g., every hour).
    Each profile is checked independently in its own task.
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
        task = detect_crisis_for_profile_task.delay(profile.id)
        task_ids.append({"profile_id": profile.id, "task_id": task.id})

    logger.info(f"Crisis detection queued for {len(profiles)} active profiles")

    return {
        "status": "queued",
        "profiles_count": len(profiles),
        "tasks": task_ids,
    }
