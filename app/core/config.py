"""
Application configuration using Pydantic Settings.
Loads values from environment variables / .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/reddit_monitor"

    # Reddit API
    reddit_client_id: str
    reddit_client_secret: str
    reddit_user_agent: str = "reddit-monitor-app"

    # OpenAI
    openai_api_key: Optional[str] = None

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Notifications
    slack_webhook_url: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    notification_email_from: Optional[str] = None

    # App
    debug: bool = False
    secret_key: str = "change-this-in-production"

    # Scheduler settings
    fetch_interval_minutes: int = 15
    aggregation_interval_minutes: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
