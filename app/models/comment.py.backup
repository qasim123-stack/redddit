"""Comment model for Reddit comments"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Comment(Base):
    """Reddit Comment model"""

    __tablename__ = "comments"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Reddit Data
    reddit_id = Column(String(50), unique=True, index=True, nullable=False)
    body = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)

    # Author Info
    author = Column(String(100), index=True)
    author_fullname = Column(String(50))

    # Relationships & Hierarchy
    link_id = Column(String(50), ForeignKey("posts.reddit_id"), index=True)  # Parent post
    parent_id = Column(String(50), index=True)  # Parent comment or post (t1_ or t3_)
    depth = Column(Integer, default=0)  # Comment nesting level

    # Subreddit Info
    subreddit = Column(String(100), index=True, nullable=False)
    subreddit_id = Column(String(50))

    # Engagement Metrics
    score = Column(Integer, default=0)
    ups = Column(Integer, default=0)
    downs = Column(Integer, default=0)
    controversiality = Column(Integer, default=0)

    # Comment Metadata
    is_submitter = Column(Boolean, default=False)  # Is OP?
    stickied = Column(Boolean, default=False)
    locked = Column(Boolean, default=False)
    distinguished = Column(String(20))  # mod, admin, etc.

    # Timestamps
    created_utc = Column(DateTime, nullable=False)
    retrieved_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    post = relationship("Post", back_populates="comments")

    def __repr__(self):
        return f"<Comment(id={self.id}, reddit_id='{self.reddit_id}', author='{self.author}')>"

    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "reddit_id": self.reddit_id,
            "body": self.body,
            "author": self.author,
            "link_id": self.link_id,
            "parent_id": self.parent_id,
            "depth": self.depth,
            "subreddit": self.subreddit,
            "score": self.score,
            "ups": self.ups,
            "controversiality": self.controversiality,
            "is_submitter": self.is_submitter,
            "created_utc": self.created_utc.isoformat() if self.created_utc else None,
        }
