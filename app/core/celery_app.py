"""Celery application configuration"""

from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "reddit_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.reddit_tasks",
        "app.tasks.ai_tasks",
        "app.tasks.pipeline_tasks",
        "app.tasks.crisis_tasks",
        "app.tasks.trend_tasks",
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,      # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_pool='threads',         # Windows compatibility
    result_expires=3600,           # Results expire after 1 hour
)

# ============================================================
# Task routing — each task type goes to its own queue
# ============================================================
# Queues:
#   reddit_monitor  — fetching posts from Reddit (PRAW)
#   ai_analysis     — GPT-4o-mini analysis calls
#   pipeline        — orchestration, crisis detection, trends
#
# To start all workers:
#   celery -A app.core.celery_app worker -Q reddit_monitor -c 2
#   celery -A app.core.celery_app worker -Q ai_analysis -c 4
#   celery -A app.core.celery_app worker -Q pipeline -c 2
#   celery -A app.core.celery_app beat --loglevel=info
# ============================================================
celery_app.conf.task_routes = {
    "app.tasks.reddit_tasks.*": {"queue": "reddit_monitor"},
    "app.tasks.ai_tasks.*": {"queue": "ai_analysis"},
    "app.tasks.pipeline_tasks.*": {"queue": "pipeline"},
    "app.tasks.crisis_tasks.*": {"queue": "pipeline"},
    "app.tasks.trend_tasks.*": {"queue": "pipeline"},
}

# ============================================================
# Celery Beat — periodic task schedule
# ============================================================
# These run automatically when you start `celery beat`.
# All times are UTC.
# ============================================================
celery_app.conf.beat_schedule = {

    # Smart refresh: runs every 5 minutes, only refreshes profiles
    # that are actually due based on their polling_frequency_minutes setting.
    # A profile with polling_frequency_minutes=15 gets refreshed every 15 min,
    # one with polling_frequency_minutes=60 gets refreshed every hour, etc.
    "smart-refresh-due-profiles": {
        "task": "smart_refresh_due_profiles",
        "schedule": crontab(minute="*/5"),
    },

    # Crisis detection: runs every hour at :00 for all active profiles.
    # Checks the last 24h of sentiment data against a 7-day baseline.
    "crisis-detection-hourly": {
        "task": "detect_crisis_all_active_profiles",
        "schedule": crontab(minute=0),
    },

    # Trend detection: runs every hour at :15 (offset from crisis check).
    # Compares current 24h topic/keyword counts against the previous 24h.
    "trend-detection-hourly": {
        "task": "detect_trends_all_active_profiles",
        "schedule": crontab(minute=15),
    },
}

if __name__ == "__main__":
    celery_app.start()
