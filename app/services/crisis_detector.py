"""Crisis Detection Service

Detects negative sentiment spikes by comparing current activity
against a rolling baseline window. Creates CrisisAlert records
when thresholds are exceeded.
"""

from datetime import datetime, timedelta
from typing import Optional
from collections import Counter
from decimal import Decimal
import logging

from sqlmodel import Session, select, func
from app.database import engine
from app.models import (
    Profile, AIAnalysis, RedditPost, CrisisAlert
)

logger = logging.getLogger(__name__)

# Detection algorithm constants
DETECTION_WINDOW_HOURS = 24       # Compare the last 24 hours
BASELINE_WINDOW_DAYS = 7          # Against the previous 7 days
MIN_POSTS_FOR_DETECTION = 5       # Need at least 5 posts to avoid false positives
MIN_BASELINE_POSTS = 3            # Need at least 3 baseline posts for comparison
DUPLICATE_ALERT_COOLDOWN_HOURS = 6  # Don't re-alert within 6 hours


def _severity_from_multiplier(multiplier: float) -> str:
    """Map spike multiplier to severity level."""
    if multiplier >= 5.0:
        return "critical"
    elif multiplier >= 3.0:
        return "high"
    elif multiplier >= 2.0:
        return "medium"
    else:
        return "low"


def _has_recent_active_alert(db: Session, profile_id: int) -> bool:
    """Check if there's already an active alert within the cooldown window."""
    cooldown_start = datetime.utcnow() - timedelta(hours=DUPLICATE_ALERT_COOLDOWN_HOURS)
    existing = db.exec(
        select(CrisisAlert).where(
            CrisisAlert.profile_id == profile_id,
            CrisisAlert.status == "active",
            CrisisAlert.created_at >= cooldown_start
        )
    ).first()
    return existing is not None


def _get_top_pain_points(analyses: list) -> list[str]:
    """Extract top pain point categories from a list of AIAnalysis objects."""
    pain_points = [
        a.pain_point_category
        for a in analyses
        if a.has_pain_point and a.pain_point_category
    ]
    counts = Counter(pain_points)
    return [item for item, _ in counts.most_common(5)]


def _get_top_keywords(analyses: list) -> list[str]:
    """Extract top keywords across a list of AIAnalysis objects."""
    all_keywords = []
    for a in analyses:
        if a.extracted_keywords:
            all_keywords.extend(a.extracted_keywords)
    counts = Counter(all_keywords)
    return [kw for kw, _ in counts.most_common(10)]


def detect_crisis_for_profile(profile_id: int) -> Optional[dict]:
    """
    Run crisis detection for a single profile.

    Algorithm:
    1. Get analyzed posts in detection window (last 24h)
    2. Get analyzed posts in baseline window (previous 7 days before detection window)
    3. Calculate hourly negative rate for both windows
    4. If current_rate > baseline_rate * profile.crisis_threshold_multiplier → create alert

    Returns:
        dict with alert details if crisis detected, None otherwise
    """
    now = datetime.utcnow()
    detection_start = now - timedelta(hours=DETECTION_WINDOW_HOURS)
    baseline_end = detection_start
    baseline_start = baseline_end - timedelta(days=BASELINE_WINDOW_DAYS)

    with Session(engine) as db:
        # Load profile to get threshold multiplier and user_id
        profile = db.exec(
            select(Profile).where(Profile.id == profile_id)
        ).first()

        if not profile:
            logger.error(f"Profile {profile_id} not found")
            return None

        if not profile.is_active:
            return None

        # Check if we already alerted recently to avoid alert spam
        if _has_recent_active_alert(db, profile_id):
            logger.info(f"Profile {profile_id}: active alert exists within cooldown window, skipping")
            return None

        threshold_multiplier = float(profile.crisis_threshold_multiplier or 3.0)

        # --- Detection window: last 24h ---
        current_analyses = db.exec(
            select(AIAnalysis).where(
                AIAnalysis.profile_id == profile_id,
                AIAnalysis.analyzed_at >= detection_start,
                AIAnalysis.analyzed_at <= now,
            )
        ).all()

        current_total = len(current_analyses)
        current_negative = sum(1 for a in current_analyses if a.sentiment_label == "negative")

        if current_total < MIN_POSTS_FOR_DETECTION:
            logger.info(
                f"Profile {profile_id}: only {current_total} posts in detection window "
                f"(need {MIN_POSTS_FOR_DETECTION}), skipping"
            )
            return None

        # --- Baseline window: 7 days before detection window ---
        baseline_analyses = db.exec(
            select(AIAnalysis).where(
                AIAnalysis.profile_id == profile_id,
                AIAnalysis.analyzed_at >= baseline_start,
                AIAnalysis.analyzed_at < baseline_end,
            )
        ).all()

        baseline_total = len(baseline_analyses)
        baseline_negative = sum(1 for a in baseline_analyses if a.sentiment_label == "negative")

        # --- Calculate hourly rates ---
        current_rate = current_negative / DETECTION_WINDOW_HOURS  # negatives per hour

        if baseline_total < MIN_BASELINE_POSTS:
            # No meaningful baseline — if we have any negatives at all, flag low severity
            if current_negative >= MIN_POSTS_FOR_DETECTION:
                baseline_rate = 0.0
                spike_multiplier = float("inf")
                severity = "low"  # cautious since no baseline
                logger.info(
                    f"Profile {profile_id}: no baseline data, "
                    f"{current_negative} negatives detected with no history"
                )
            else:
                return None
        else:
            baseline_rate = baseline_negative / (BASELINE_WINDOW_DAYS * 24)  # per hour
            if baseline_rate == 0:
                # Zero baseline but current negatives exist
                if current_negative > 0:
                    spike_multiplier = threshold_multiplier * 2  # force a high multiplier
                    severity = "medium"
                else:
                    return None
            else:
                spike_multiplier = current_rate / baseline_rate

            if spike_multiplier < threshold_multiplier:
                logger.info(
                    f"Profile {profile_id}: spike multiplier {spike_multiplier:.2f}x "
                    f"below threshold {threshold_multiplier}x, no crisis"
                )
                return None

            severity = _severity_from_multiplier(spike_multiplier)

        # --- Crisis detected! Gather details ---
        negative_analyses = [a for a in current_analyses if a.sentiment_label == "negative"]
        sample_post_ids = [a.post_id for a in negative_analyses[:10]]
        top_pain_points = _get_top_pain_points(negative_analyses)
        top_keywords = _get_top_keywords(negative_analyses)

        spike_mult_rounded = round(spike_multiplier, 2) if spike_multiplier != float("inf") else 99.99

        logger.warning(
            f"CRISIS DETECTED - Profile {profile_id}: "
            f"{current_negative}/{current_total} negative posts in last 24h "
            f"({spike_mult_rounded}x spike, severity={severity})"
        )

        # --- Create CrisisAlert record ---
        alert = CrisisAlert(
            profile_id=profile_id,
            user_id=profile.user_id,
            alert_type="negative_spike",
            severity=severity,
            title=f"Negative Sentiment Spike Detected ({severity.capitalize()})",
            description=(
                f"{current_negative} negative posts detected in the last {DETECTION_WINDOW_HOURS}h "
                f"({spike_mult_rounded}x above normal). "
                f"Baseline: {baseline_negative} negatives over {BASELINE_WINDOW_DAYS} days."
            ),
            negative_count_current=current_negative,
            negative_count_baseline=baseline_negative,
            spike_multiplier=Decimal(str(spike_mult_rounded)),
            affected_posts_count=current_negative,
            detection_window_start=detection_start,
            detection_window_end=now,
            baseline_window_start=baseline_start,
            baseline_window_end=baseline_end,
            sample_post_ids=sample_post_ids,
            top_pain_points=top_pain_points or None,
            top_keywords=top_keywords or None,
            status="active",
            is_notified=False,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        logger.info(f"CrisisAlert {alert.id} created for profile {profile_id}")

        return {
            "alert_id": alert.id,
            "profile_id": profile_id,
            "severity": severity,
            "spike_multiplier": spike_mult_rounded,
            "current_negative": current_negative,
            "current_total": current_total,
            "baseline_negative": baseline_negative,
        }
