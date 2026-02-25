"""Trend Detection API endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func
from datetime import datetime
import logging

from app.database import get_db
from app.models import Trend, TrendRead, Profile
from app.core.security import get_current_user_with_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trends", tags=["Trends"])


# ============================================
# TRIGGER
# ============================================

@router.post("/profiles/{profile_id}/detect", status_code=status.HTTP_202_ACCEPTED)
def trigger_trend_detection(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Manually trigger trend detection for a profile.

    Compares last 24h topic/keyword activity against the previous 24h.
    Creates Trend records for topics with significant growth or decline.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    from app.tasks.trend_tasks import detect_trends_for_profile_task
    task = detect_trends_for_profile_task.delay(profile_id)

    return {
        "message": "Trend detection queued",
        "profile_id": profile_id,
        "task_id": task.id,
    }


# ============================================
# LIST TRENDS
# ============================================

@router.get("/profiles/{profile_id}", response_model=List[TrendRead])
def list_profile_trends(
    profile_id: int,
    trend_type: Optional[str] = Query(default=None, description="rising, falling, keyword_rising"),
    status_filter: Optional[str] = Query(default="active", alias="status"),
    severity: Optional[str] = Query(default=None, description="low, medium, high"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    List trends for a profile, sorted by growth rate (fastest growing first).

    Filters:
    - **trend_type**: `rising`, `falling`, `keyword_rising`
    - **status**: `active` (default), `resolved`
    - **severity**: `low`, `medium`, `high`
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    query = select(Trend).where(Trend.profile_id == profile_id)

    if trend_type:
        query = query.where(Trend.trend_type == trend_type)
    if status_filter:
        query = query.where(Trend.status == status_filter)
    if severity:
        query = query.where(Trend.severity == severity)

    query = query.order_by(Trend.growth_rate.desc()).offset(offset).limit(limit)
    trends = db.exec(query).all()
    return trends


@router.get("/", response_model=List[TrendRead])
def list_all_trends(
    trend_type: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default="active", alias="status"),
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """List all active trends across all profiles for the current user."""
    query = select(Trend).where(Trend.user_id == current_user_id)

    if trend_type:
        query = query.where(Trend.trend_type == trend_type)
    if status_filter:
        query = query.where(Trend.status == status_filter)
    if severity:
        query = query.where(Trend.severity == severity)

    query = query.order_by(Trend.growth_rate.desc()).offset(offset).limit(limit)
    return db.exec(query).all()


@router.get("/profiles/{profile_id}/summary")
def get_trends_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get a quick trends summary for a profile.

    Returns counts by type and severity, plus the top 5 trending topics.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    active_trends = db.exec(
        select(Trend).where(
            Trend.profile_id == profile_id,
            Trend.status == "active",
        ).order_by(Trend.growth_rate.desc())
    ).all()

    rising = [t for t in active_trends if t.trend_type == "rising"]
    falling = [t for t in active_trends if t.trend_type == "falling"]
    keyword_rising = [t for t in active_trends if t.trend_type == "keyword_rising"]

    top_topics = [
        {
            "topic": t.topic,
            "growth_rate": float(t.growth_rate or 0),
            "current_count": t.current_count,
            "severity": t.severity,
            "sentiment": {
                "positive": t.positive_count,
                "neutral": t.neutral_count,
                "negative": t.negative_count,
            }
        }
        for t in rising[:5]
    ]

    top_keywords = [
        {
            "keyword": t.topic,
            "growth_rate": float(t.growth_rate or 0),
            "current_count": t.current_count,
        }
        for t in keyword_rising[:5]
    ]

    return {
        "profile_id": profile_id,
        "total_active_trends": len(active_trends),
        "rising_count": len(rising),
        "falling_count": len(falling),
        "keyword_rising_count": len(keyword_rising),
        "high_severity_count": sum(1 for t in active_trends if t.severity == "high"),
        "top_trending_topics": top_topics,
        "top_trending_keywords": top_keywords,
    }


# ============================================
# MANAGE INDIVIDUAL TRENDS
# ============================================

@router.get("/{trend_id}", response_model=TrendRead)
def get_trend(
    trend_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Get a specific trend by ID."""
    trend = db.exec(
        select(Trend).where(
            Trend.id == trend_id,
            Trend.user_id == current_user_id,
        )
    ).first()

    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    return trend


@router.post("/{trend_id}/resolve", response_model=TrendRead)
def resolve_trend(
    trend_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """Mark a trend as resolved (dismiss it from the active list)."""
    trend = db.exec(
        select(Trend).where(
            Trend.id == trend_id,
            Trend.user_id == current_user_id,
        )
    ).first()

    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    trend.status = "resolved"
    trend.updated_at = datetime.utcnow()
    db.add(trend)
    db.commit()
    db.refresh(trend)

    return trend
