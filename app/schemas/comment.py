"""Pydantic schemas for Comment API responses"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class CommentBase(BaseModel):
    """Base Comment schema"""

    reddit_id: str
    body: str
    author: str
    link_id: str
    parent_id: str
    depth: int
    subreddit: str
    score: int
    ups: int
    created_utc: datetime


class CommentCreate(CommentBase):
    """Schema for creating a comment"""

    pass


class CommentResponse(CommentBase):
    """Schema for Comment API response"""

    id: int
    is_submitter: bool
    controversiality: int
    retrieved_at: datetime
    replies: List["CommentResponse"] = []  # Nested replies

    class Config:
        from_attributes = True


# Enable forward references for nested structure
CommentResponse.model_rebuild()
