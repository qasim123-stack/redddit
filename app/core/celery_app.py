"""Celery application configuration"""

from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "reddit_monitor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.reddit_tasks", "app.tasks.ai_tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_pool='threads',  # ← ADD THIS (Windows compatibility)
    result_expires=3600,  # Results expire after 1 hour
)

# Task routes (optional - for organizing tasks)
celery_app.conf.task_routes = {
    "app.tasks.reddit_tasks.*": {"queue": "reddit_monitor"},
    "app.tasks.ai_tasks.*": {"queue": "ai_analysis"},
}

if __name__ == "__main__":
    celery_app.start()
