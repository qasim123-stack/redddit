"""
Database models.
Import all models here to ensure they are registered with SQLAlchemy.
"""
from app.models.profile import (
    Profile,
    Subreddit,
    Keyword,
    CompetitorKeyword,
    profile_subreddits,
)
from app.models.reddit_post import (
    RedditPost,
    AIAnalysis,
    CompetitorAnalysis,
)

__all__ = [
    "Profile",
    "Subreddit",
    "Keyword",
    "CompetitorKeyword",
    "profile_subreddits",
    "RedditPost",
    "AIAnalysis",
    "CompetitorAnalysis",
]
