"""
Pydantic schemas for Profile API.
Used for request validation and response serialization.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ============== Subreddit Schemas ==============

class SubredditBase(BaseModel):
    """Base schema for subreddit."""
    name: str = Field(..., min_length=1, max_length=100, description="Subreddit name without r/")


class SubredditCreate(SubredditBase):
    """Schema for creating a subreddit."""
    pass


class SubredditResponse(SubredditBase):
    """Schema for subreddit in responses."""
    id: int
    display_name: Optional[str] = None
    subscribers: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Keyword Schemas ==============

class KeywordBase(BaseModel):
    """Base schema for keyword."""
    keyword: str = Field(..., min_length=1, max_length=255)
    is_regex: bool = False
    case_sensitive: bool = False


class KeywordCreate(KeywordBase):
    """Schema for creating a keyword."""
    pass


class KeywordResponse(KeywordBase):
    """Schema for keyword in responses."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Competitor Keyword Schemas ==============

class CompetitorKeywordBase(BaseModel):
    """Base schema for competitor keyword."""
    keyword: str = Field(..., min_length=1, max_length=255)
    competitor_name: Optional[str] = Field(None, max_length=255)


class CompetitorKeywordCreate(CompetitorKeywordBase):
    """Schema for creating a competitor keyword."""
    pass


class CompetitorKeywordResponse(CompetitorKeywordBase):
    """Schema for competitor keyword in responses."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============== Profile Schemas ==============

class ProfileBase(BaseModel):
    """Base schema for profile."""
    name: str = Field(..., min_length=1, max_length=255, description="Profile name")
    description: Optional[str] = Field(None, description="Optional description")


class AIFeatures(BaseModel):
    """AI feature toggles."""
    sentiment_enabled: bool = Field(True, description="Enable sentiment analysis")
    intent_enabled: bool = Field(True, description="Enable intent detection")
    entity_enabled: bool = Field(True, description="Enable entity extraction")
    deep_analysis_enabled: bool = Field(True, description="Enable GPT-3.5 deep analysis for negative posts")
    competitor_analysis_enabled: bool = Field(True, description="Enable competitor analysis")


class ProfileCreate(ProfileBase):
    """
    Schema for creating a new profile.

    Example:
    {
        "name": "FastAPI Monitoring",
        "description": "Monitor FastAPI mentions",
        "subreddits": ["Python", "FastAPI"],
        "keywords": [
            {"keyword": "FastAPI"},
            {"keyword": "async"}
        ],
        "competitor_keywords": [
            {"keyword": "Django", "competitor_name": "Django Framework"},
            {"keyword": "Flask", "competitor_name": "Flask Framework"}
        ],
        "ai_features": {
            "sentiment_enabled": true,
            "intent_enabled": true,
            "entity_enabled": true,
            "deep_analysis_enabled": true,
            "competitor_analysis_enabled": true
        }
    }
    """
    subreddits: list[str] = Field(
        ...,
        min_length=1,
        description="List of subreddit names to monitor"
    )
    keywords: list[KeywordCreate] = Field(
        ...,
        min_length=1,
        description="Keywords to match for relevance"
    )
    competitor_keywords: list[CompetitorKeywordCreate] = Field(
        default_factory=list,
        description="Competitor keywords to detect"
    )
    ai_features: AIFeatures = Field(
        default_factory=AIFeatures,
        description="AI feature toggles"
    )
    is_active: bool = Field(True, description="Whether profile is active")


class ProfileUpdate(BaseModel):
    """
    Schema for updating a profile.
    All fields are optional - only provided fields will be updated.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subreddits: Optional[list[str]] = None
    keywords: Optional[list[KeywordCreate]] = None
    competitor_keywords: Optional[list[CompetitorKeywordCreate]] = None
    ai_features: Optional[AIFeatures] = None
    is_active: Optional[bool] = None


class ProfileResponse(ProfileBase):
    """
    Schema for profile in responses.
    Includes all related data.
    """
    id: int
    is_active: bool

    # AI feature flags
    ai_sentiment_enabled: bool
    ai_intent_enabled: bool
    ai_entity_enabled: bool
    ai_deep_analysis_enabled: bool
    ai_competitor_analysis_enabled: bool

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_fetched_at: Optional[datetime] = None

    # Related data
    subreddits: list[SubredditResponse] = []
    keywords: list[KeywordResponse] = []
    competitor_keywords: list[CompetitorKeywordResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ProfileListResponse(BaseModel):
    """Schema for paginated profile list."""
    items: list[ProfileResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProfileStats(BaseModel):
    """Statistics for a profile."""
    profile_id: int
    total_posts: int
    relevant_posts: int
    posts_with_competitor_mentions: int
    pending_posts: int
    processed_posts: int
    sentiment_breakdown: dict  # {"positive": 10, "negative": 5, "neutral": 3}
