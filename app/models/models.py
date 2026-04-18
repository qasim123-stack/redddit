"""
SQLModel ORM Schema for Reddit Social Listening SaaS
FastAPI Application Models
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship, Column, JSON, ARRAY, String, Index
from sqlalchemy import Text, DECIMAL, text
from pydantic import field_validator
import re


# ============================================
# USERS & AUTHENTICATION
# ============================================

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True, max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    subscription_tier: str = Field(default="free", max_length=50)

    @field_validator('email')
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email format')
        return v


class User(UserBase, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str = Field(max_length=255)
    email_verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None
    subscription_expires_at: Optional[datetime] = None

    # Relationships
    preferences: Optional["UserPreferences"] = Relationship(back_populates="user")
    profiles: List["Profile"] = Relationship(back_populates="user")
    reddit_posts: List["RedditPost"] = Relationship(back_populates="user")
    trends: List["Trend"] = Relationship(back_populates="user")
    crisis_alerts: List["CrisisAlert"] = Relationship(back_populates="user")
    competitor_analyses: List["CompetitorAnalysis"] = Relationship(back_populates="user")
    customer_languages: List["CustomerLanguage"] = Relationship(back_populates="user")
    influencers: List["Influencer"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")
    summary_reports: List["SummaryReport"] = Relationship(back_populates="user")
    search_history: List["SearchHistory"] = Relationship(back_populates="user")
    webhooks: List["Webhook"] = Relationship(back_populates="user")
    api_keys: List["APIKey"] = Relationship(back_populates="user")


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserRead(UserBase):
    id: int
    created_at: datetime
    last_login_at: Optional[datetime]


class UserUpdate(SQLModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    subscription_tier: Optional[str] = None


class UserPreferences(SQLModel, table=True):
    __tablename__ = "user_preferences"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    notification_email: bool = Field(default=True)
    notification_in_app: bool = Field(default=True)
    notification_crisis_alerts: bool = Field(default=True)
    notification_daily_summary: bool = Field(default=True)
    notification_trending_topics: bool = Field(default=True)
    theme: str = Field(default="light", max_length=20)
    timezone: str = Field(default="UTC", max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="preferences")


# ============================================
# MONITORING PROFILES
# ============================================

class ProfileBase(SQLModel):
    name: str = Field(max_length=255)
    description: Optional[str] = None
    is_active: bool = Field(default=True)
    keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    subreddits: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    competitor_keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    polling_frequency_minutes: int = Field(default=15, ge=5)
    fetch_limit_per_subreddit: int = Field(default=100)
    historical_days: int = Field(default=7)
    enable_sentiment: bool = Field(default=True)
    enable_intent: bool = Field(default=True)
    enable_pain_detection: bool = Field(default=True)
    enable_entity_extraction: bool = Field(default=True)
    enable_topic_extraction: bool = Field(default=True)
    enable_embedding: bool = Field(default=True)
    crisis_threshold_multiplier: Decimal = Field(default=Decimal("3.0"), sa_column=Column(DECIMAL(4, 2)))
    trend_growth_threshold: Decimal = Field(default=Decimal("0.5"), sa_column=Column(DECIMAL(4, 2)))


class Profile(ProfileBase, table=True):
    __tablename__ = "profiles"
    __table_args__ = (
        Index("idx_profiles_user_id", "user_id"),
        Index("idx_profiles_active", "is_active", postgresql_where=text("is_active = TRUE")),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    last_fetch_at: Optional[datetime] = None
    total_posts_fetched: int = Field(default=0)
    total_posts_analyzed: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="profiles")
    reddit_posts: List["RedditPost"] = Relationship(back_populates="profile")
    ai_analyses: List["AIAnalysis"] = Relationship(back_populates="profile")
    trends: List["Trend"] = Relationship(back_populates="profile")
    crisis_alerts: List["CrisisAlert"] = Relationship(back_populates="profile")
    competitor_analyses: List["CompetitorAnalysis"] = Relationship(back_populates="profile")
    customer_languages: List["CustomerLanguage"] = Relationship(back_populates="profile")
    influencers: List["Influencer"] = Relationship(back_populates="profile")
    notifications: List["Notification"] = Relationship(back_populates="profile")
    summary_reports: List["SummaryReport"] = Relationship(back_populates="profile")
    webhooks: List["Webhook"] = Relationship(back_populates="profile")


class ProfileCreate(ProfileBase):
    pass


class ProfileRead(ProfileBase):
    id: int
    user_id: int
    last_fetch_at: Optional[datetime]
    total_posts_fetched: int
    total_posts_analyzed: int
    created_at: datetime


class ProfileUpdate(SQLModel):
    """Schema for updating profile fields. All fields are optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    keywords: Optional[List[str]] = None
    subreddits: Optional[List[str]] = None
    competitor_keywords: Optional[List[str]] = None
    polling_frequency_minutes: Optional[int] = Field(default=None, ge=5)
    fetch_limit_per_subreddit: Optional[int] = None
    historical_days: Optional[int] = None
    # AI Feature toggles
    enable_sentiment: Optional[bool] = None
    enable_intent: Optional[bool] = None
    enable_pain_detection: Optional[bool] = None
    enable_entity_extraction: Optional[bool] = None
    enable_topic_extraction: Optional[bool] = None
    enable_embedding: Optional[bool] = None
    # Alert thresholds
    crisis_threshold_multiplier: Optional[Decimal] = None
    trend_growth_threshold: Optional[Decimal] = None


# ============================================
# REDDIT POSTS
# ============================================

class RedditPostBase(SQLModel):
    reddit_id: str = Field(unique=True, index=True, max_length=50)
    subreddit: str = Field(max_length=255, index=True)
    author: Optional[str] = Field(default=None, max_length=255)
    title: Optional[str] = Field(default=None, sa_column=Column(Text))
    selftext: Optional[str] = Field(default=None, sa_column=Column(Text))
    url: Optional[str] = Field(default=None, sa_column=Column(Text))
    permalink: Optional[str] = Field(default=None, sa_column=Column(Text))
    score: int = Field(default=0)
    upvote_ratio: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(4, 3)))
    num_comments: int = Field(default=0)
    created_utc: datetime
    processing_status: str = Field(default="pending", max_length=50)
    matched_keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    is_relevant: bool = Field(default=True)
    is_archived: bool = Field(default=False)


class RedditPost(RedditPostBase, table=True):
    __tablename__ = "reddit_posts"
    __table_args__ = (
        Index("idx_reddit_posts_profile_id", "profile_id"),
        Index("idx_reddit_posts_user_id", "user_id"),
        Index("idx_reddit_posts_subreddit", "subreddit"),
        Index("idx_reddit_posts_created_utc", "created_utc"),
        Index("idx_reddit_posts_status", "processing_status"),
        Index("idx_reddit_posts_reddit_id", "reddit_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="reddit_posts")
    user: Optional["User"] = Relationship(back_populates="reddit_posts")
    ai_analysis: Optional["AIAnalysis"] = Relationship(back_populates="post")


class RedditPostCreate(RedditPostBase):
    profile_id: int
    user_id: int


class RedditPostRead(RedditPostBase):
    id: int
    profile_id: int
    user_id: int
    fetched_at: datetime
    processed_at: Optional[datetime]


# ============================================
# AI/NLP ANALYSIS
# ============================================

class AIAnalysisBase(SQLModel):
    sentiment_label: Optional[str] = Field(default=None, max_length=20)
    sentiment_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    emotion: Optional[str] = Field(default=None, max_length=50)
    emotion_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    intent_label: Optional[str] = Field(default=None, max_length=50)
    intent_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    has_pain_point: bool = Field(default=False)
    pain_point_category: Optional[str] = Field(default=None, max_length=100)
    pain_point_severity: Optional[str] = Field(default=None, max_length=20)
    pain_point_phrases: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    entities: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    entity_count: int = Field(default=0)
    topics: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    topic_scores: Optional[List[Decimal]] = Field(default=None, sa_column=Column(ARRAY(DECIMAL(5, 4))))
    main_topic: Optional[str] = Field(default=None, max_length=255)
    extracted_keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    keyword_scores: Optional[List[Decimal]] = Field(default=None, sa_column=Column(ARRAY(DECIMAL(5, 4))))
    embedding_id: Optional[str] = Field(default=None, max_length=100)
    embedding_generated: bool = Field(default=False)
    model_version: Optional[str] = Field(default=None, max_length=50)
    processing_time_ms: Optional[int] = None


class AIAnalysis(AIAnalysisBase, table=True):
    __tablename__ = "ai_analysis"
    __table_args__ = (
        Index("idx_ai_analysis_post_id", "post_id"),
        Index("idx_ai_analysis_profile_id", "profile_id"),
        Index("idx_ai_analysis_sentiment", "sentiment_label"),
        Index("idx_ai_analysis_pain_point", "has_pain_point", postgresql_where=text("has_pain_point = TRUE")),
        Index("idx_ai_analysis_intent", "intent_label"),
        Index("idx_ai_analysis_topics", "topics", postgresql_using="gin"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="reddit_posts.id", unique=True, index=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    post: Optional["RedditPost"] = Relationship(back_populates="ai_analysis")
    profile: Optional["Profile"] = Relationship(back_populates="ai_analyses")


class AIAnalysisCreate(AIAnalysisBase):
    post_id: int
    profile_id: int


class AIAnalysisRead(AIAnalysisBase):
    id: int
    post_id: int
    profile_id: int
    analyzed_at: datetime


# ============================================
# TRENDS & ANALYTICS
# ============================================

class TrendBase(SQLModel):
    topic: str = Field(max_length=255)
    trend_type: str = Field(default="topic", max_length=50)
    current_count: int
    previous_count: int
    growth_rate: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(6, 3)))
    growth_absolute: Optional[int] = None
    positive_count: int = Field(default=0)
    neutral_count: int = Field(default=0)
    negative_count: int = Field(default=0)
    period_start: datetime
    period_end: datetime
    comparison_period_start: datetime
    comparison_period_end: datetime
    status: str = Field(default="active", max_length=20)
    severity: Optional[str] = Field(default=None, max_length=20)
    is_notified: bool = Field(default=False)
    notified_at: Optional[datetime] = None


class Trend(TrendBase, table=True):
    __tablename__ = "trends"
    __table_args__ = (
        Index("idx_trends_profile_id", "profile_id"),
        Index("idx_trends_created_at", "created_at"),
        Index("idx_trends_growth_rate", "growth_rate"),
        Index("idx_trends_status", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="trends")
    user: Optional["User"] = Relationship(back_populates="trends")


class TrendCreate(TrendBase):
    profile_id: int
    user_id: int


class TrendRead(TrendBase):
    id: int
    profile_id: int
    user_id: int
    created_at: datetime


# ============================================
# CRISIS ALERTS
# ============================================

class CrisisAlertBase(SQLModel):
    alert_type: str = Field(default="negative_spike", max_length=50)
    severity: str = Field(max_length=20)
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    negative_count_current: Optional[int] = None
    negative_count_baseline: Optional[int] = None
    spike_multiplier: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(6, 2)))
    affected_posts_count: Optional[int] = None
    detection_window_start: datetime
    detection_window_end: datetime
    baseline_window_start: Optional[datetime] = None
    baseline_window_end: Optional[datetime] = None
    sample_post_ids: Optional[List[int]] = Field(default=None, sa_column=Column(ARRAY(String)))
    top_pain_points: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    top_keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    status: str = Field(default="active", max_length=20)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_notified: bool = Field(default=False)
    notified_at: Optional[datetime] = None
    notification_channels: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))


class CrisisAlert(CrisisAlertBase, table=True):
    __tablename__ = "crisis_alerts"
    __table_args__ = (
        Index("idx_crisis_alerts_profile_id", "profile_id"),
        Index("idx_crisis_alerts_severity", "severity"),
        Index("idx_crisis_alerts_status", "status"),
        Index("idx_crisis_alerts_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="crisis_alerts")
    user: Optional["User"] = Relationship(back_populates="crisis_alerts")


class CrisisAlertCreate(CrisisAlertBase):
    profile_id: int
    user_id: int


class CrisisAlertRead(CrisisAlertBase):
    id: int
    profile_id: int
    user_id: int
    created_at: datetime


# ============================================
# COMPETITOR ANALYSIS
# ============================================

class CompetitorAnalysisBase(SQLModel):
    competitor_name: str = Field(max_length=255)
    competitor_keywords: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    mention_count: int = Field(default=0)
    sentiment_positive: int = Field(default=0)
    sentiment_neutral: int = Field(default=0)
    sentiment_negative: int = Field(default=0)
    average_sentiment_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    total_score: int = Field(default=0)
    total_comments: int = Field(default=0)
    average_engagement: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(8, 2)))
    pain_point_count: int = Field(default=0)
    top_pain_points: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    top_topics: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    analysis_date: date
    period_start: datetime
    period_end: datetime
    sample_post_ids: Optional[List[int]] = Field(default=None, sa_column=Column(ARRAY(String)))


class CompetitorAnalysis(CompetitorAnalysisBase, table=True):
    __tablename__ = "competitor_analysis"
    __table_args__ = (
        Index("idx_competitor_analysis_profile_id", "profile_id"),
        Index("idx_competitor_analysis_date", "analysis_date"),
        Index("idx_competitor_analysis_competitor", "competitor_name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="competitor_analyses")
    user: Optional["User"] = Relationship(back_populates="competitor_analyses")


class CompetitorAnalysisCreate(CompetitorAnalysisBase):
    profile_id: int
    user_id: int


class CompetitorAnalysisRead(CompetitorAnalysisBase):
    id: int
    profile_id: int
    user_id: int
    created_at: datetime


# ============================================
# CUSTOMER LANGUAGE / PHRASES
# ============================================

class CustomerLanguageBase(SQLModel):
    phrase: str = Field(sa_column=Column(Text))
    phrase_type: Optional[str] = Field(default=None, max_length=20)
    word_count: Optional[int] = None
    occurrence_count: int = Field(default=1)
    document_count: int = Field(default=1)
    positive_count: int = Field(default=0)
    neutral_count: int = Field(default=0)
    negative_count: int = Field(default=0)
    sentiment_association: Optional[str] = Field(default=None, max_length=20)
    average_sentiment_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    common_topics: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    sample_contexts: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    analysis_date: date
    period_start: datetime
    period_end: datetime
    tf_idf_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(10, 6)))
    importance_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))


class CustomerLanguage(CustomerLanguageBase, table=True):
    __tablename__ = "customer_language"
    __table_args__ = (
        Index("idx_customer_language_profile_id", "profile_id"),
        Index("idx_customer_language_phrase", "phrase"),
        Index("idx_customer_language_occurrence", "occurrence_count"),
        Index("idx_customer_language_date", "analysis_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="customer_languages")
    user: Optional["User"] = Relationship(back_populates="customer_languages")


class CustomerLanguageCreate(CustomerLanguageBase):
    profile_id: int
    user_id: int


class CustomerLanguageRead(CustomerLanguageBase):
    id: int
    profile_id: int
    user_id: int
    created_at: datetime


# ============================================
# INFLUENCERS
# ============================================

class InfluencerBase(SQLModel):
    reddit_username: str = Field(max_length=255)
    post_count: int = Field(default=0)
    comment_count: int = Field(default=0)
    total_activity: int = Field(default=0)
    total_karma: int = Field(default=0)
    average_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(8, 2)))
    total_comments_received: int = Field(default=0)
    average_comments: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(8, 2)))
    positive_posts: int = Field(default=0)
    neutral_posts: int = Field(default=0)
    negative_posts: int = Field(default=0)
    sentiment_ratio: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(5, 4)))
    influence_score: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(10, 4)))
    influence_rank: Optional[int] = None
    top_topics: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    top_subreddits: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    analysis_date: date
    period_start: datetime
    period_end: datetime
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    sample_post_ids: Optional[List[int]] = Field(default=None, sa_column=Column(ARRAY(String)))


class Influencer(InfluencerBase, table=True):
    __tablename__ = "influencers"
    __table_args__ = (
        Index("idx_influencers_profile_id", "profile_id"),
        Index("idx_influencers_username", "reddit_username"),
        Index("idx_influencers_score", "influence_score"),
        Index("idx_influencers_date", "analysis_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    profile: Optional["Profile"] = Relationship(back_populates="influencers")
    user: Optional["User"] = Relationship(back_populates="influencers")


class InfluencerCreate(InfluencerBase):
    profile_id: int
    user_id: int


class InfluencerRead(InfluencerBase):
    id: int
    profile_id: int
    user_id: int
    created_at: datetime


# ============================================
# NOTIFICATIONS
# ============================================

class NotificationBase(SQLModel):
    type: str = Field(max_length=50)
    title: str = Field(max_length=255)
    message: Optional[str] = Field(default=None, sa_column=Column(Text))
    related_entity_type: Optional[str] = Field(default=None, max_length=50)
    related_entity_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    severity: str = Field(default="info", max_length=20)
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = None
    is_archived: bool = Field(default=False)
    archived_at: Optional[datetime] = None
    channels: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    sent_via_email: bool = Field(default=False)
    email_sent_at: Optional[datetime] = None


class Notification(NotificationBase, table=True):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("idx_notifications_user_id", "user_id"),
        Index("idx_notifications_profile_id", "profile_id"),
        Index("idx_notifications_is_read", "is_read", postgresql_where=text("is_read = FALSE")),
        Index("idx_notifications_created_at", "created_at"),
        Index("idx_notifications_type", "type"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    profile_id: Optional[int] = Field(default=None, foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="notifications")
    profile: Optional["Profile"] = Relationship(back_populates="notifications")


class NotificationCreate(NotificationBase):
    user_id: int
    profile_id: Optional[int] = None


class NotificationRead(NotificationBase):
    id: int
    user_id: int
    profile_id: Optional[int]
    created_at: datetime


# ============================================
# SUMMARY REPORTS
# ============================================

class SummaryReportBase(SQLModel):
    report_type: str = Field(default="daily", max_length=50)
    report_date: date
    period_start: datetime
    period_end: datetime
    total_posts: int = Field(default=0)
    total_comments: int = Field(default=0)
    total_engagement: int = Field(default=0)
    sentiment_positive: int = Field(default=0)
    sentiment_neutral: int = Field(default=0)
    sentiment_negative: int = Field(default=0)
    sentiment_trend: Optional[str] = Field(default=None, max_length=20)
    top_topics: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    top_pain_points: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    top_subreddits: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    top_keywords: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    crisis_alerts_count: int = Field(default=0)
    trends_count: int = Field(default=0)
    change_vs_previous_period: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    is_sent: bool = Field(default=False)
    sent_at: Optional[datetime] = None
    delivery_channels: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))


class SummaryReport(SummaryReportBase, table=True):
    __tablename__ = "summary_reports"
    __table_args__ = (
        Index("idx_summary_reports_profile_id", "profile_id"),
        Index("idx_summary_reports_user_id", "user_id"),
        Index("idx_summary_reports_date", "report_date"),
        Index("idx_summary_reports_type", "report_type"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="summary_reports")
    profile: Optional["Profile"] = Relationship(back_populates="summary_reports")


class SummaryReportCreate(SummaryReportBase):
    user_id: int
    profile_id: int


class SummaryReportRead(SummaryReportBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime


# ============================================
# SEARCH HISTORY
# ============================================

class SearchHistoryBase(SQLModel):
    search_type: str = Field(max_length=50)
    query_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    query_vector: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    filters: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    results_count: int = Field(default=0)
    clicked_post_ids: Optional[List[int]] = Field(default=None, sa_column=Column(ARRAY(String)))
    search_duration_ms: Optional[int] = None


class SearchHistory(SearchHistoryBase, table=True):
    __tablename__ = "search_history"
    __table_args__ = (
        Index("idx_search_history_user_id", "user_id"),
        Index("idx_search_history_profile_id", "profile_id"),
        Index("idx_search_history_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    profile_id: Optional[int] = Field(default=None, foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="search_history")


class SearchHistoryCreate(SearchHistoryBase):
    user_id: int
    profile_id: Optional[int] = None


# ============================================
# WEBHOOKS
# ============================================

class WebhookBase(SQLModel):
    name: str = Field(max_length=255)
    url: str = Field(sa_column=Column(Text))
    secret_key: Optional[str] = Field(default=None, max_length=255)
    events: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    filters: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    last_triggered_at: Optional[datetime] = None
    success_count: int = Field(default=0)
    failure_count: int = Field(default=0)
    retry_count: int = Field(default=3)
    timeout_seconds: int = Field(default=30)


class Webhook(WebhookBase, table=True):
    __tablename__ = "webhooks"
    __table_args__ = (
        Index("idx_webhooks_user_id", "user_id"),
        Index("idx_webhooks_profile_id", "profile_id"),
        Index("idx_webhooks_active", "is_active", postgresql_where=text("is_active = TRUE")),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    profile_id: int = Field(foreign_key="profiles.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="webhooks")
    profile: Optional["Profile"] = Relationship(back_populates="webhooks")
    logs: List["WebhookLog"] = Relationship(back_populates="webhook")


class WebhookCreate(WebhookBase):
    user_id: int
    profile_id: int


class WebhookRead(WebhookBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime


# ============================================
# WEBHOOK LOGS
# ============================================

class WebhookLogBase(SQLModel):
    event_type: str = Field(max_length=50)
    payload: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    status_code: Optional[int] = None
    response_body: Optional[str] = Field(default=None, sa_column=Column(Text))
    response_time_ms: Optional[int] = None
    success: bool = Field(default=False)
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    retry_attempt: int = Field(default=0)


class WebhookLog(WebhookLogBase, table=True):
    __tablename__ = "webhook_logs"
    __table_args__ = (
        Index("idx_webhook_logs_webhook_id", "webhook_id"),
        Index("idx_webhook_logs_created_at", "created_at"),
        Index("idx_webhook_logs_success", "success"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    webhook_id: int = Field(foreign_key="webhooks.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    webhook: Optional["Webhook"] = Relationship(back_populates="logs")


class WebhookLogCreate(WebhookLogBase):
    webhook_id: int


# ============================================
# API KEYS
# ============================================

class APIKeyBase(SQLModel):
    key_name: str = Field(max_length=255)
    key_prefix: Optional[str] = Field(default=None, max_length=20)
    scopes: Optional[List[str]] = Field(default=None, sa_column=Column(ARRAY(String)))
    rate_limit_per_hour: int = Field(default=1000)
    requests_count: int = Field(default=0)
    last_request_at: Optional[datetime] = None
    is_active: bool = Field(default=True)
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None


class APIKey(APIKeyBase, table=True):
    __tablename__ = "api_keys"
    __table_args__ = (
        Index("idx_api_keys_user_id", "user_id"),
        Index("idx_api_keys_hash", "key_hash"),
        Index("idx_api_keys_active", "is_active", postgresql_where=text("is_active = TRUE")),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    key_hash: str = Field(unique=True, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="api_keys")


class APIKeyCreate(APIKeyBase):
    user_id: int
    key_hash: str


class APIKeyRead(APIKeyBase):
    id: int
    user_id: int
    key_prefix: Optional[str]
    created_at: datetime


# ============================================
# AUDIT LOGS
# ============================================

class AuditLogBase(SQLModel):
    action: str = Field(max_length=100)
    entity_type: Optional[str] = Field(default=None, max_length=50)
    entity_id: Optional[int] = None
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, sa_column=Column(Text))
    request_method: Optional[str] = Field(default=None, max_length=10)
    request_path: Optional[str] = Field(default=None, sa_column=Column(Text))
    old_values: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    new_values: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))


class AuditLog(AuditLogBase, table=True):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_entity", "entity_type", "entity_id"),
        Index("idx_audit_logs_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None


# ============================================
# SYSTEM METRICS
# ============================================

class SystemMetricBase(SQLModel):
    metric_name: str = Field(max_length=100)
    metric_type: str = Field(max_length=50)
    value: Optional[Decimal] = Field(default=None, sa_column=Column(DECIMAL(15, 4)))
    tags: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    timestamp: datetime


class SystemMetric(SystemMetricBase, table=True):
    __tablename__ = "system_metrics"
    __table_args__ = (
        Index("idx_system_metrics_name", "metric_name"),
        Index("idx_system_metrics_timestamp", "timestamp"),
        Index("idx_system_metrics_tags", "tags", postgresql_using="gin"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SystemMetricCreate(SystemMetricBase):
    pass


# ============================================
# SAVED POSTS
# ============================================

class SavedPost(SQLModel, table=True):
    __tablename__ = "saved_posts"
    __table_args__ = (
        Index("idx_saved_posts_user_id", "user_id"),
        Index("idx_saved_posts_post_id", "post_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    post_id: int = Field(foreign_key="reddit_posts.id", index=True)
    note: Optional[str] = Field(default=None, sa_column=Column(Text))
    saved_at: datetime = Field(default_factory=datetime.utcnow)


class SavedPostRead(SQLModel):
    id: int
    user_id: int
    post_id: int
    note: Optional[str]
    saved_at: datetime
    post: Optional["RedditPostRead"] = None
