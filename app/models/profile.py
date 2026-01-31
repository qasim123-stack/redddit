"""
Profile model - represents a user's monitoring configuration.
Each profile has:
- Subreddits to monitor
- Keywords to match (for relevance filtering)
- Competitor keywords to detect
- AI feature toggles
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
)
from sqlalchemy.orm import relationship
from app.core.database import Base


# Association table for Profile <-> Subreddit (many-to-many)
profile_subreddits = Table(
    "profile_subreddits",
    Base.metadata,
    Column("profile_id", Integer, ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True),
    Column("subreddit_id", Integer, ForeignKey("subreddits.id", ondelete="CASCADE"), primary_key=True),
)


class Profile(Base):
    """
    User monitoring profile.

    Example:
        Profile(
            name="FastAPI Monitoring",
            subreddits=["Python", "FastAPI"],
            keywords=["FastAPI", "async"],
            competitor_keywords=["Django", "Flask"],
            ai_sentiment_enabled=True
        )
    """
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # AI Feature Toggles
    ai_sentiment_enabled = Column(Boolean, default=True)
    ai_intent_enabled = Column(Boolean, default=True)
    ai_entity_enabled = Column(Boolean, default=True)
    ai_deep_analysis_enabled = Column(Boolean, default=True)  # GPT-3.5 for negative posts
    ai_competitor_analysis_enabled = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_fetched_at = Column(DateTime, nullable=True)  # Last time posts were fetched

    # Relationships
    subreddits = relationship(
        "Subreddit",
        secondary=profile_subreddits,
        back_populates="profiles",
        lazy="selectin"
    )
    keywords = relationship(
        "Keyword",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    competitor_keywords = relationship(
        "CompetitorKeyword",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    reddit_posts = relationship(
        "RedditPost",
        back_populates="profile",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Profile(id={self.id}, name='{self.name}', active={self.is_active})>"


class Subreddit(Base):
    """
    Subreddit to monitor.
    Can be shared across multiple profiles.
    """
    __tablename__ = "subreddits"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "Python" (without r/)
    display_name = Column(String(100), nullable=True)  # Full display name
    description = Column(Text, nullable=True)
    subscribers = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profiles = relationship(
        "Profile",
        secondary=profile_subreddits,
        back_populates="subreddits"
    )

    def __repr__(self):
        return f"<Subreddit(name='r/{self.name}')>"


class Keyword(Base):
    """
    Keywords to match for relevance filtering.
    Posts containing these keywords are marked as is_relevant=True.
    """
    __tablename__ = "keywords"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String(255), nullable=False, index=True)
    is_regex = Column(Boolean, default=False)  # If true, treat as regex pattern
    case_sensitive = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="keywords")

    def __repr__(self):
        return f"<Keyword(keyword='{self.keyword}')>"


class CompetitorKeyword(Base):
    """
    Competitor keywords to detect.
    Posts containing these trigger competitor analysis.
    """
    __tablename__ = "competitor_keywords"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String(255), nullable=False, index=True)
    competitor_name = Column(String(255), nullable=True)  # e.g., "Django" keyword -> "Django Framework" competitor

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="competitor_keywords")

    def __repr__(self):
        return f"<CompetitorKeyword(keyword='{self.keyword}')>"
