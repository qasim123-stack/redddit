"""Pydantic schemas for Post API responses"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class PostBase(BaseModel):
    """Base Post schema"""

    reddit_id: str
    title: str
    selftext: Optional[str] = None
    url: Optional[str] = None
    permalink: str
    author: str
    subreddit: str
    score: int
    ups: int
    num_comments: int
    upvote_ratio: float
    created_utc: datetime


class PostCreate(PostBase):
    """Schema for creating a post"""

    pass


class PostResponse(PostBase):
    """Schema for Post API response"""

    id: int
    retrieved_at: datetime
    is_self: bool
    is_video: bool

    class Config:
        from_attributes = True


class PostWithComments(PostResponse):
    """Post with nested comments"""

    comments: List["CommentResponse"] = []

    class Config:
        from_attributes = True


# Import to avoid circular dependency
from .comment import CommentResponse

PostWithComments.model_rebuild()
