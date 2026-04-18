"""AI Analysis API endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, col, func
from datetime import datetime

from app.database import get_db
from app.models import (
    AIAnalysis, AIAnalysisRead,
    RedditPost, Profile,
)
from app.core.security import get_current_user_with_db
from app.tasks.ai_tasks import (
    analyze_single_post_task,
    analyze_profile_posts_task,
    analyze_post_batch_task,
    reanalyze_post_task,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["AI Analysis"])


# ============================================
# TRIGGER ANALYSIS
# ============================================

@router.post("/posts/{post_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_post_analysis(
    post_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Trigger AI analysis for a single post.

    Queues the post for background analysis using GPT-4o-mini.
    Returns immediately with a task ID to check status.
    """
    # Verify post belongs to user
    post = db.exec(
        select(RedditPost).where(
            RedditPost.id == post_id,
            RedditPost.user_id == current_user_id,
        )
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Check if already analyzed
    existing = db.exec(
        select(AIAnalysis).where(AIAnalysis.post_id == post_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Post already analyzed. Use /reanalyze to re-run.",
        )

    task = analyze_single_post_task.delay(post_id)

    return {
        "status": "queued",
        "task_id": task.id,
        "post_id": post_id,
        "message": "Analysis queued. Check task status for results.",
    }


@router.post("/posts/{post_id}/reanalyze", status_code=status.HTTP_202_ACCEPTED)
def trigger_post_reanalysis(
    post_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Re-analyze a post. Overwrites previous analysis results.
    """
    post = db.exec(
        select(RedditPost).where(
            RedditPost.id == post_id,
            RedditPost.user_id == current_user_id,
        )
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    task = reanalyze_post_task.delay(post_id)

    return {
        "status": "queued",
        "task_id": task.id,
        "post_id": post_id,
        "message": "Re-analysis queued.",
    }


@router.post("/profiles/{profile_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_profile_analysis(
    profile_id: int,
    limit: int = Query(50, ge=1, le=500, description="Max posts to analyze"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Analyze all unanalyzed posts for a profile.

    Queues up to `limit` pending posts for background AI analysis.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Count pending posts
    pending_count = db.exec(
        select(func.count(RedditPost.id)).where(
            RedditPost.profile_id == profile_id,
            RedditPost.processing_status == "pending",
        )
    ).one()

    if pending_count == 0:
        return {
            "status": "no_posts",
            "profile_id": profile_id,
            "message": "No unanalyzed posts found for this profile.",
        }

    task = analyze_profile_posts_task.delay(profile_id, limit)

    return {
        "status": "queued",
        "task_id": task.id,
        "profile_id": profile_id,
        "pending_posts": pending_count,
        "batch_limit": limit,
        "message": f"Analysis queued for up to {min(limit, pending_count)} posts.",
    }


@router.post("/batch", status_code=status.HTTP_202_ACCEPTED)
def trigger_batch_analysis(
    post_ids: List[int],
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Analyze a specific batch of posts by ID.
    """
    if not post_ids:
        raise HTTPException(status_code=400, detail="post_ids list cannot be empty")
    if len(post_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 posts per batch")

    # Verify all posts belong to user
    user_posts = db.exec(
        select(RedditPost.id).where(
            RedditPost.id.in_(post_ids),
            RedditPost.user_id == current_user_id,
        )
    ).all()

    valid_ids = [p for p in user_posts]
    if not valid_ids:
        raise HTTPException(status_code=404, detail="No valid posts found")

    task = analyze_post_batch_task.delay(valid_ids)

    return {
        "status": "queued",
        "task_id": task.id,
        "posts_queued": len(valid_ids),
        "invalid_posts": len(post_ids) - len(valid_ids),
    }


# ============================================
# READ ANALYSIS RESULTS
# ============================================

@router.get("/posts/{post_id}", response_model=AIAnalysisRead)
def get_post_analysis(
    post_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get AI analysis results for a specific post.
    """
    # Verify post belongs to user
    post = db.exec(
        select(RedditPost).where(
            RedditPost.id == post_id,
            RedditPost.user_id == current_user_id,
        )
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    analysis = db.exec(
        select(AIAnalysis).where(AIAnalysis.post_id == post_id)
    ).first()
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found. Trigger analysis first.",
        )

    return analysis


@router.get("/profiles/{profile_id}/results")
def get_profile_analysis_results(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment label"),
    intent: Optional[str] = Query(None, description="Filter by intent label"),
    has_pain_point: Optional[bool] = Query(None, description="Filter posts with pain points"),
):
    """
    Get all analysis results for a profile with filtering.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    statement = select(AIAnalysis).where(AIAnalysis.profile_id == profile_id)

    if sentiment:
        statement = statement.where(AIAnalysis.sentiment_label == sentiment)
    if intent:
        statement = statement.where(AIAnalysis.intent_label == intent)
    if has_pain_point is not None:
        statement = statement.where(AIAnalysis.has_pain_point == has_pain_point)

    statement = statement.order_by(AIAnalysis.analyzed_at.desc()).offset(skip).limit(limit)

    results = db.exec(statement).all()

    return {
        "profile_id": profile_id,
        "count": len(results),
        "filters": {
            "sentiment": sentiment,
            "intent": intent,
            "has_pain_point": has_pain_point,
        },
        "results": results,
    }


# ============================================
# AGGREGATED INSIGHTS
# ============================================

@router.get("/sentiment-overview")
def get_global_sentiment_overview(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get aggregated sentiment counts across ALL profiles for the current user.
    Used by the dashboard donut chart.
    """
    # Get all profile IDs belonging to this user
    profile_ids = db.exec(
        select(Profile.id).where(Profile.user_id == current_user_id)
    ).all()

    if not profile_ids:
        return {"positive": 0, "negative": 0, "neutral": 0, "total": 0}

    analyses = db.exec(
        select(AIAnalysis).where(AIAnalysis.profile_id.in_(profile_ids))
    ).all()

    positive = sum(1 for a in analyses if a.sentiment_label == "positive")
    negative = sum(1 for a in analyses if a.sentiment_label == "negative")
    neutral = sum(1 for a in analyses if a.sentiment_label in ("neutral", "mixed"))

    return {
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
        "total": len(analyses),
    }


@router.get("/profiles/{profile_id}/sentiment-summary")
def get_sentiment_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get aggregated sentiment breakdown for a profile.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyses = db.exec(
        select(AIAnalysis).where(AIAnalysis.profile_id == profile_id)
    ).all()

    if not analyses:
        return {
            "profile_id": profile_id,
            "total_analyzed": 0,
            "message": "No analyses found. Run analysis first.",
        }

    total = len(analyses)
    positive = sum(1 for a in analyses if a.sentiment_label == "positive")
    negative = sum(1 for a in analyses if a.sentiment_label == "negative")
    neutral = sum(1 for a in analyses if a.sentiment_label == "neutral")
    mixed = sum(1 for a in analyses if a.sentiment_label == "mixed")

    scores = [float(a.sentiment_score) for a in analyses if a.sentiment_score is not None]
    avg_score = sum(scores) / len(scores) if scores else 0

    return {
        "profile_id": profile_id,
        "total_analyzed": total,
        "sentiment_breakdown": {
            "positive": {"count": positive, "percentage": round(positive / total * 100, 1)},
            "negative": {"count": negative, "percentage": round(negative / total * 100, 1)},
            "neutral": {"count": neutral, "percentage": round(neutral / total * 100, 1)},
            "mixed": {"count": mixed, "percentage": round(mixed / total * 100, 1)},
        },
        "average_sentiment_score": round(avg_score, 4),
    }


@router.get("/profiles/{profile_id}/intent-summary")
def get_intent_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get aggregated intent breakdown for a profile.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyses = db.exec(
        select(AIAnalysis).where(AIAnalysis.profile_id == profile_id)
    ).all()

    if not analyses:
        return {"profile_id": profile_id, "total_analyzed": 0}

    # Count intents
    intent_counts = {}
    for a in analyses:
        label = a.intent_label or "unknown"
        intent_counts[label] = intent_counts.get(label, 0) + 1

    total = len(analyses)
    intent_breakdown = {
        intent: {"count": count, "percentage": round(count / total * 100, 1)}
        for intent, count in sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)
    }

    return {
        "profile_id": profile_id,
        "total_analyzed": total,
        "intent_breakdown": intent_breakdown,
    }


@router.get("/profiles/{profile_id}/pain-points")
def get_pain_points_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get all detected pain points for a profile, grouped by category.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyses = db.exec(
        select(AIAnalysis).where(
            AIAnalysis.profile_id == profile_id,
            AIAnalysis.has_pain_point == True,
        )
    ).all()

    # Group by category
    categories = {}
    all_phrases = []
    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}

    for a in analyses:
        cat = a.pain_point_category or "uncategorized"
        if cat not in categories:
            categories[cat] = {"count": 0, "phrases": [], "severities": []}
        categories[cat]["count"] += 1
        categories[cat]["severities"].append(a.pain_point_severity)

        if a.pain_point_phrases:
            categories[cat]["phrases"].extend(a.pain_point_phrases)
            all_phrases.extend(a.pain_point_phrases)

        if a.pain_point_severity in severity_counts:
            severity_counts[a.pain_point_severity] += 1

    return {
        "profile_id": profile_id,
        "total_pain_points": len(analyses),
        "severity_breakdown": severity_counts,
        "categories": categories,
        "sample_phrases": all_phrases[:20],
    }


@router.get("/profiles/{profile_id}/entities")
def get_entities_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get all extracted entities for a profile, aggregated by type.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyses = db.exec(
        select(AIAnalysis).where(
            AIAnalysis.profile_id == profile_id,
            AIAnalysis.entity_count > 0,
        )
    ).all()

    # Aggregate entities with counts
    products = {}
    companies = {}
    technologies = {}
    people = {}

    for a in analyses:
        if not a.entities:
            continue
        for p in a.entities.get("products", []):
            products[p] = products.get(p, 0) + 1
        for c in a.entities.get("companies", []):
            companies[c] = companies.get(c, 0) + 1
        for t in a.entities.get("technologies", []):
            technologies[t] = technologies.get(t, 0) + 1
        for person in a.entities.get("people", []):
            people[person] = people.get(person, 0) + 1

    def sort_by_count(d):
        return [{"name": k, "count": v} for k, v in sorted(d.items(), key=lambda x: x[1], reverse=True)]

    return {
        "profile_id": profile_id,
        "posts_with_entities": len(analyses),
        "products": sort_by_count(products),
        "companies": sort_by_count(companies),
        "technologies": sort_by_count(technologies),
        "people": sort_by_count(people),
    }


@router.get("/profiles/{profile_id}/topics")
def get_topics_summary(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Get topic distribution for a profile.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id,
        )
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    analyses = db.exec(
        select(AIAnalysis).where(AIAnalysis.profile_id == profile_id)
    ).all()

    # Count topics
    topic_counts = {}
    for a in analyses:
        if a.topics:
            for topic in a.topics:
                topic_counts[topic] = topic_counts.get(topic, 0) + 1
        elif a.main_topic:
            topic_counts[a.main_topic] = topic_counts.get(a.main_topic, 0) + 1

    total = len(analyses)
    topic_breakdown = [
        {
            "topic": topic,
            "count": count,
            "percentage": round(count / total * 100, 1) if total > 0 else 0,
        }
        for topic, count in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "profile_id": profile_id,
        "total_analyzed": total,
        "topics": topic_breakdown,
    }


# ============================================
# TASK STATUS
# ============================================

@router.get("/task/{task_id}")
def get_analysis_task_status(
    task_id: str,
    current_user_id: int = Depends(get_current_user_with_db),
):
    """
    Check the status of an analysis task.
    """
    from app.core.celery_app import celery_app

    result = celery_app.AsyncResult(task_id)

    response = {
        "task_id": task_id,
        "status": result.status,
    }

    if result.ready():
        response["result"] = result.result
    elif result.failed():
        response["error"] = str(result.result)

    return response
