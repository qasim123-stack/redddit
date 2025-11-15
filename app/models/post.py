"""Post model for Reddit submissions"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Post(Base):
    """Reddit Post/Submission model"""

    __tablename__ = "posts"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Reddit Data
    reddit_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    selftext = Column(Text, nullable=True)  # Post body (for text posts)
    url = Column(String(2000), nullable=True)  # Link URL
    permalink = Column(String(500), nullable=False)

    # Author Info
    author = Column(String(100), index=True)
    author_fullname = Column(String(50))

    # Subreddit Info
    subreddit = Column(String(100), index=True, nullable=False)
    subreddit_id = Column(String(50))
    subreddit_subscribers = Column(Integer)

    # Engagement Metrics
    score = Column(Integer, default=0)
    ups = Column(Integer, default=0)
    downs = Column(Integer, default=0)
    upvote_ratio = Column(Float, default=0.0)
    num_comments = Column(Integer, default=0)

    # Post Metadata
    is_self = Column(Boolean, default=True)  # Text post vs link
    is_video = Column(Boolean, default=False)
    over_18 = Column(Boolean, default=False)  # NSFW
    spoiler = Column(Boolean, default=False)
    locked = Column(Boolean, default=False)
    stickied = Column(Boolean, default=False)

    # Timestamps
    created_utc = Column(DateTime, nullable=False)
    retrieved_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post(id={self.id}, reddit_id='{self.reddit_id}', title='{self.title[:50]}...')>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "reddit_id": self.reddit_id,
            "title": self.title,
            "selftext": self.selftext,
            "url": self.url,
            "permalink": self.permalink,
            "author": self.author,
            "subreddit": self.subreddit,
            "score": self.score,
            "ups": self.ups,
            "num_comments": self.num_comments,
            "upvote_ratio": self.upvote_ratio,
            "created_utc": self.created_utc.isoformat() if self.created_utc else None,
            "is_self": self.is_self,
            "is_video": self.is_video,
        }
