"""Celery tasks module"""

from .reddit_tasks import fetch_hot_posts_task, fetch_post_comments_task, monitor_subreddit_stream
from .ai_tasks import analyze_single_post_task, analyze_profile_posts_task, analyze_post_batch_task, reanalyze_post_task
from .pipeline_tasks import process_new_profile_task, refresh_profile_task, refresh_all_active_profiles_task, full_analysis_pipeline_task
from .crisis_tasks import detect_crisis_for_profile_task, notify_crisis_alert_task, detect_crisis_all_active_profiles_task
from .trend_tasks import detect_trends_for_profile_task, detect_trends_all_active_profiles_task, smart_refresh_due_profiles_task

__all__ = [
    # Reddit tasks
    "fetch_hot_posts_task",
    "fetch_post_comments_task",
    "monitor_subreddit_stream",
    # AI analysis tasks
    "analyze_single_post_task",
    "analyze_profile_posts_task",
    "analyze_post_batch_task",
    "reanalyze_post_task",
    # Pipeline orchestration tasks
    "process_new_profile_task",
    "refresh_profile_task",
    "refresh_all_active_profiles_task",
    "full_analysis_pipeline_task",
    # Crisis detection tasks
    "detect_crisis_for_profile_task",
    "notify_crisis_alert_task",
    "detect_crisis_all_active_profiles_task",
    # Trend detection tasks
    "detect_trends_for_profile_task",
    "detect_trends_all_active_profiles_task",
    "smart_refresh_due_profiles_task",
]
