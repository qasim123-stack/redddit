"""Celery tasks module"""

from .reddit_tasks import fetch_hot_posts_task, fetch_post_comments_task, monitor_subreddit_stream
from .ai_tasks import analyze_single_post_task, analyze_profile_posts_task, analyze_post_batch_task, reanalyze_post_task
from .pipeline_tasks import process_new_profile_task, refresh_profile_task, refresh_all_active_profiles_task, full_analysis_pipeline_task

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
]
