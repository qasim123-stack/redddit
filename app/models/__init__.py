"""
SQLModel models for Reddit AI Platform
All models exported here for Alembic and FastAPI
"""

from .models import (
    # Core - Table Models
    User,
    UserPreferences,

    # Monitoring - Table Models
    Profile,
    RedditPost,

    # Analytics - Table Models
    AIAnalysis,
    Trend,
    CrisisAlert,
    CompetitorAnalysis,
    CustomerLanguage,
    Influencer,

    # Notifications - Table Models
    Notification,
    SummaryReport,

    # Integrations - Table Models
    Webhook,
    WebhookLog,
    APIKey,

    # System - Table Models
    SearchHistory,
    AuditLog,
    SystemMetric,

    # Pydantic Schemas (for API)
    UserCreate,
    UserRead,
    UserUpdate,
    ProfileCreate,
    ProfileRead,
    ProfileUpdate,
    RedditPostCreate,
    RedditPostRead,
    AIAnalysisCreate,
    AIAnalysisRead,
    TrendCreate,
    TrendRead,
    CrisisAlertCreate,
    CrisisAlertRead,
    CompetitorAnalysisCreate,
    CompetitorAnalysisRead,
    CustomerLanguageCreate,
    CustomerLanguageRead,
    InfluencerCreate,
    InfluencerRead,
    NotificationCreate,
    NotificationRead,
    SummaryReportCreate,
    SummaryReportRead,
    WebhookCreate,
    WebhookRead,
    WebhookLogCreate,
    APIKeyCreate,
    APIKeyRead,
    SearchHistoryCreate,
    AuditLogCreate,
    SystemMetricCreate,
)

__all__ = [
    # Table models
    "User",
    "UserPreferences",
    "Profile",
    "RedditPost",
    "AIAnalysis",
    "Trend",
    "CrisisAlert",
    "CompetitorAnalysis",
    "CustomerLanguage",
    "Influencer",
    "Notification",
    "SummaryReport",
    "Webhook",
    "WebhookLog",
    "APIKey",
    "SearchHistory",
    "AuditLog",
    "SystemMetric",

    # Schema models (for API)
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "ProfileCreate",
    "ProfileRead",
    "ProfileUpdate",
    "RedditPostCreate",
    "RedditPostRead",
    "AIAnalysisCreate",
    "AIAnalysisRead",
    "TrendCreate",
    "TrendRead",
    "CrisisAlertCreate",
    "CrisisAlertRead",
    "CompetitorAnalysisCreate",
    "CompetitorAnalysisRead",
    "CustomerLanguageCreate",
    "CustomerLanguageRead",
    "InfluencerCreate",
    "InfluencerRead",
    "NotificationCreate",
    "NotificationRead",
    "SummaryReportCreate",
    "SummaryReportRead",
    "WebhookCreate",
    "WebhookRead",
    "WebhookLogCreate",
    "APIKeyCreate",
    "APIKeyRead",
    "SearchHistoryCreate",
    "AuditLogCreate",
    "SystemMetricCreate",
]
