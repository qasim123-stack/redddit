"""Trend Detection Service

Detects trending topics and keywords by comparing the current period
against a comparison period. Creates Trend records for significant
growth patterns.
"""

from datetime import datetime, timedelta, date
from collections import Counter
from decimal import Decimal
from typing import Optional
import logging

from sqlmodel import Session, select
from app.database import engine
from app.models import Profile, AIAnalysis, Trend

logger = logging.getLogger(__name__)

# Detection constants
PERIOD_HOURS = 24               # Length of each comparison window (24h)
MIN_MENTIONS_TO_TREND = 3       # Minimum occurrences to be considered a trend
DUPLICATE_TREND_COOLDOWN_HOURS = 12  # Don't re-create a trend record within 12h


def _severity_from_growth(growth_rate: float) -> str:
    """Map growth rate to severity."""
    if growth_rate >= 2.0:   # 200%+ growth
        return "high"
    elif growth_rate >= 1.0:  # 100%+ growth
        return "medium"
    else:
        return "low"


def _get_sentiment_breakdown(analyses: list, target_topic: str) -> dict:
    """
    Get positive/neutral/negative counts for posts containing a topic.
    """
    positive = neutral = negative = 0
    for a in analyses:
        if target_topic in (a.topics or []):
            label = a.sentiment_label or "neutral"
            if label == "positive":
                positive += 1
            elif label == "negative":
                negative += 1
            else:
                neutral += 1
    return {"positive": positive, "neutral": neutral, "negative": negative}


def _has_recent_trend(db: Session, profile_id: int, topic: str) -> bool:
    """Check if this topic was already flagged as a trend recently."""
    cutoff = datetime.utcnow() - timedelta(hours=DUPLICATE_TREND_COOLDOWN_HOURS)
    existing = db.exec(
        select(Trend).where(
            Trend.profile_id == profile_id,
            Trend.topic == topic,
            Trend.created_at >= cutoff,
            Trend.status == "active",
        )
    ).first()
    return existing is not None


def detect_trends_for_profile(
    profile_id: int,
    period_hours: int = PERIOD_HOURS,
) -> dict:
    """
    Detect trending topics and keywords for a single profile.

    Algorithm:
    1. Get AIAnalysis records in current period (last 24h)
    2. Get AIAnalysis records in comparison period (24h before that)
    3. Count topic occurrences in each period
    4. Calculate growth_rate = (current - previous) / max(previous, 1)
    5. If growth_rate >= profile.trend_growth_threshold → create Trend record

    Also detects keyword trends from extracted_keywords.

    Returns:
        dict with counts of new trends created
    """
    now = datetime.utcnow()
    current_start = now - timedelta(hours=period_hours)
    previous_start = current_start - timedelta(hours=period_hours)
    previous_end = current_start

    with Session(engine) as db:
        profile = db.exec(
            select(Profile).where(Profile.id == profile_id)
        ).first()

        if not profile or not profile.is_active:
            return {"status": "skipped", "profile_id": profile_id}

        threshold = float(profile.trend_growth_threshold or 0.5)

        # --- Load analyses for both windows ---
        current_analyses = db.exec(
            select(AIAnalysis).where(
                AIAnalysis.profile_id == profile_id,
                AIAnalysis.analyzed_at >= current_start,
                AIAnalysis.analyzed_at <= now,
            )
        ).all()

        previous_analyses = db.exec(
            select(AIAnalysis).where(
                AIAnalysis.profile_id == profile_id,
                AIAnalysis.analyzed_at >= previous_start,
                AIAnalysis.analyzed_at < previous_end,
            )
        ).all()

        if not current_analyses:
            logger.info(f"Profile {profile_id}: no analyses in current window, skipping trends")
            return {"status": "no_data", "profile_id": profile_id}

        # --- Count topics ---
        current_topics = Counter(
            topic
            for a in current_analyses
            for topic in (a.topics or [])
        )
        previous_topics = Counter(
            topic
            for a in previous_analyses
            for topic in (a.topics or [])
        )

        # --- Count keywords ---
        current_keywords = Counter(
            kw
            for a in current_analyses
            for kw in (a.extracted_keywords or [])
        )
        previous_keywords = Counter(
            kw
            for a in previous_analyses
            for kw in (a.extracted_keywords or [])
        )

        trends_created = 0

        # --- Process topic trends ---
        for topic, current_count in current_topics.most_common(20):
            if current_count < MIN_MENTIONS_TO_TREND:
                continue

            previous_count = previous_topics.get(topic, 0)
            growth_rate = (current_count - previous_count) / max(previous_count, 1)
            growth_absolute = current_count - previous_count

            # Check for falling trends too (significant drops)
            is_rising = growth_rate >= threshold
            is_falling = growth_rate <= -threshold and previous_count >= MIN_MENTIONS_TO_TREND

            if not is_rising and not is_falling:
                continue

            # Skip if we already have a recent trend for this topic
            if _has_recent_trend(db, profile_id, topic):
                continue

            trend_type = "rising" if is_rising else "falling"
            severity = _severity_from_growth(abs(growth_rate)) if is_rising else "low"
            sentiment = _get_sentiment_breakdown(current_analyses, topic)

            trend = Trend(
                profile_id=profile_id,
                user_id=profile.user_id,
                topic=topic,
                trend_type=trend_type,
                current_count=current_count,
                previous_count=previous_count,
                growth_rate=Decimal(str(round(growth_rate, 3))),
                growth_absolute=growth_absolute,
                positive_count=sentiment["positive"],
                neutral_count=sentiment["neutral"],
                negative_count=sentiment["negative"],
                period_start=current_start,
                period_end=now,
                comparison_period_start=previous_start,
                comparison_period_end=previous_end,
                status="active",
                severity=severity,
                is_notified=False,
            )
            db.add(trend)
            trends_created += 1

            logger.info(
                f"Trend detected - Profile {profile_id}: '{topic}' "
                f"({trend_type}, {growth_rate:+.1%} growth, {current_count} mentions)"
            )

        # --- Process keyword trends (top growing keywords only) ---
        keyword_trends_created = 0
        for keyword, current_count in current_keywords.most_common(50):
            # Only track keywords that appear multiple times
            if current_count < MIN_MENTIONS_TO_TREND:
                continue

            previous_count = previous_keywords.get(keyword, 0)
            growth_rate = (current_count - previous_count) / max(previous_count, 1)

            if growth_rate < threshold:
                continue

            # Skip if recent trend exists for this keyword
            if _has_recent_trend(db, profile_id, keyword):
                continue

            severity = _severity_from_growth(growth_rate)

            trend = Trend(
                profile_id=profile_id,
                user_id=profile.user_id,
                topic=keyword,
                trend_type="keyword_rising",
                current_count=current_count,
                previous_count=previous_count,
                growth_rate=Decimal(str(round(growth_rate, 3))),
                growth_absolute=current_count - previous_count,
                positive_count=0,
                neutral_count=0,
                negative_count=0,
                period_start=current_start,
                period_end=now,
                comparison_period_start=previous_start,
                comparison_period_end=previous_end,
                status="active",
                severity=severity,
                is_notified=False,
            )
            db.add(trend)
            keyword_trends_created += 1

            # Cap keyword trends at 10 per run to avoid noise
            if keyword_trends_created >= 10:
                break

        db.commit()

        total = trends_created + keyword_trends_created
        logger.info(
            f"Profile {profile_id}: {trends_created} topic trends + "
            f"{keyword_trends_created} keyword trends detected"
        )

        return {
            "status": "complete",
            "profile_id": profile_id,
            "topic_trends_created": trends_created,
            "keyword_trends_created": keyword_trends_created,
            "total_trends_created": total,
            "current_period_posts": len(current_analyses),
            "previous_period_posts": len(previous_analyses),
        }
