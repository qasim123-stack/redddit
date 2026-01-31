"""
Reddit Post model - stores fetched posts from Reddit.
Includes processing status for the AI pipeline.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class RedditPost(Base):
    """
    Fetched Reddit post.

    Processing flow:
    1. Fetched from Reddit -> processing_status = "pending"
    2. Keyword filtering applied -> is_relevant set, matched_keywords populated
    3. AI analysis -> processing_status = "processed"
    """
    __tablename__ = "reddit_posts"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)

    # Reddit identifiers
    reddit_id = Column(String(20), unique=True, nullable=False, index=True)  # e.g., "t3_abc123"
    subreddit_name = Column(String(100), nullable=False, index=True)

    # Post content
    title = Column(Text, nullable=False)
    selftext = Column(Text, nullable=True)  # Body text (empty for link posts)
    url = Column(Text, nullable=True)  # Link URL or Reddit URL
    permalink = Column(String(500), nullable=False)  # Reddit permalink
    author = Column(String(100), nullable=True, index=True)

    # Post metadata
    score = Column(Integer, default=0)
    upvote_ratio = Column(Float, nullable=True)
    num_comments = Column(Integer, default=0)
    is_self = Column(Boolean, default=True)  # True if text post, False if link
    created_utc = Column(DateTime, nullable=False)  # Original post creation time

    # Relevance filtering (Step 3B in your diagram)
    is_relevant = Column(Boolean, default=False, index=True)
    matched_keywords = Column(JSON, nullable=True)  # List of matched keywords, e.g., ["FastAPI"]

    # Competitor detection (Step 3C in your diagram)
    has_competitor_mention = Column(Boolean, default=False, index=True)
    matched_competitors = Column(JSON, nullable=True)  # List of matched competitor keywords

    # Processing status
    processing_status = Column(
        String(20),
        default="pending",
        index=True
    )  # pending, processing, processed, failed
    processing_error = Column(Text, nullable=True)

    # Timestamps
    fetched_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    profile = relationship("Profile", back_populates="reddit_posts")
    ai_analysis = relationship(
        "AIAnalysis",
        back_populates="reddit_post",
        uselist=False,  # One-to-one
        cascade="all, delete-orphan"
    )
    competitor_analysis = relationship(
        "CompetitorAnalysis",
        back_populates="reddit_post",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<RedditPost(reddit_id='{self.reddit_id}', title='{self.title[:50]}...')>"


class AIAnalysis(Base):
    """
    AI analysis results for a Reddit post.

    Stage A (Fast AI - Immediate):
    - Sentiment analysis
    - Intent detection
    - Entity extraction

    Stage B (Deep AI - Only for negative sentiment):
    - Pain point detection via GPT-3.5
    """
    __tablename__ = "ai_analysis"

    id = Column(Integer, primary_key=True, index=True)
    reddit_post_id = Column(
        Integer,
        ForeignKey("reddit_posts.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    # Stage A: Fast AI Results
    # Sentiment
    sentiment = Column(String(20), nullable=True)  # positive, negative, neutral
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    sentiment_confidence = Column(Float, nullable=True)  # 0.0 to 1.0

    # Intent
    intent = Column(String(50), nullable=True)  # question, complaint, praise, feature_request, discussion
    intent_confidence = Column(Float, nullable=True)

    # Entities
    entities = Column(JSON, nullable=True)  # List of extracted entities
    # Example: [{"text": "FastAPI", "type": "TECHNOLOGY"}, {"text": "Python 3.11", "type": "VERSION"}]

    # Stage B: Deep AI Results (only for negative posts)
    deep_analysis_triggered = Column(Boolean, default=False)
    pain_points = Column(JSON, nullable=True)  # Extracted pain points
    # Example: ["performance issues with large datasets", "lack of documentation"]
    suggested_solutions = Column(JSON, nullable=True)

    # Cost tracking
    fast_ai_cost = Column(Float, default=0.0)  # Cost for Stage A
    deep_ai_cost = Column(Float, default=0.0)  # Cost for Stage B (~$0.003 per post)
    total_cost = Column(Float, default=0.0)

    # Timestamps
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    deep_analyzed_at = Column(DateTime, nullable=True)

    # Relationships
    reddit_post = relationship("RedditPost", back_populates="ai_analysis")

    def __repr__(self):
        return f"<AIAnalysis(post_id={self.reddit_post_id}, sentiment='{self.sentiment}')>"


class CompetitorAnalysis(Base):
    """
    Competitor analysis for posts mentioning competitor keywords.
    (Stage C in your diagram)
    """
    __tablename__ = "competitor_analysis"

    id = Column(Integer, primary_key=True, index=True)
    reddit_post_id = Column(
        Integer,
        ForeignKey("reddit_posts.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    # Which competitors were mentioned
    competitors_mentioned = Column(JSON, nullable=False)  # ["Django", "Flask"]

    # Light sentiment analysis for comparison
    sentiment_towards_competitors = Column(JSON, nullable=True)
    # Example: {"Django": {"sentiment": "positive", "score": 0.7}, "Flask": {"sentiment": "neutral", "score": 0.1}}

    # Comparison detection
    is_comparison_post = Column(Boolean, default=False)  # True if post compares products
    comparison_summary = Column(Text, nullable=True)
    our_product_sentiment = Column(String(20), nullable=True)  # How they feel about YOUR product

    # Timestamps
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    reddit_post = relationship("RedditPost", back_populates="competitor_analysis")

    def __repr__(self):
        return f"<CompetitorAnalysis(post_id={self.reddit_post_id}, competitors={self.competitors_mentioned})>"
