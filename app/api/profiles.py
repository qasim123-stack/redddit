"""Profile Management API endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, col
from datetime import datetime
import logging

from app.database import get_db
from app.models import Profile, ProfileCreate, ProfileRead, ProfileUpdate, User
from app.core.security import get_current_user_with_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["Profiles"])


# ============================================
# PROFILE CRUD ENDPOINTS
# ============================================

@router.post("", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Create a new monitoring profile.

    A profile defines what to monitor on Reddit:
    - **name**: Profile name (required)
    - **description**: Optional description
    - **subreddits**: List of subreddits to monitor
    - **keywords**: List of keywords to track
    - **competitor_keywords**: List of competitor-related keywords
    - **polling_frequency_minutes**: How often to fetch new posts (min 5)
    - **enable_***: Toggle AI analysis features

    Returns the created profile with its ID.
    """
    # Verify user exists
    user = db.exec(select(User).where(User.id == current_user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create the profile
    new_profile = Profile(
        **profile_data.model_dump(),
        user_id=current_user_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    logger.info(f"Profile created: {new_profile.name} (ID: {new_profile.id}) by user {current_user_id}")

    return new_profile


@router.get("", response_model=List[ProfileRead])
def list_profiles(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db),
    skip: int = Query(0, ge=0, description="Number of profiles to skip"),
    limit: int = Query(100, ge=1, le=100, description="Max profiles to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or description")
):
    """
    List all profiles for the current user.

    Supports pagination and filtering:
    - **skip**: Number of profiles to skip (for pagination)
    - **limit**: Maximum number of profiles to return (1-100)
    - **is_active**: Filter by active/inactive status
    - **search**: Search profiles by name or description

    Returns a list of profiles owned by the authenticated user.
    """
    # Build query
    statement = select(Profile).where(Profile.user_id == current_user_id)

    # Apply filters
    if is_active is not None:
        statement = statement.where(Profile.is_active == is_active)

    if search:
        search_term = f"%{search}%"
        statement = statement.where(
            (col(Profile.name).ilike(search_term)) |
            (col(Profile.description).ilike(search_term))
        )

    # Apply pagination and ordering
    statement = statement.order_by(Profile.created_at.desc()).offset(skip).limit(limit)

    profiles = db.exec(statement).all()

    return profiles


@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Get a specific profile by ID.

    Returns the full profile details if it belongs to the authenticated user.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    return profile


@router.put("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: int,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Update an existing profile.

    Only provided fields will be updated:
    - **name**: Profile name
    - **description**: Profile description
    - **is_active**: Enable/disable profile
    - **keywords**: Update keywords list
    - **subreddits**: Update subreddits list
    - **competitor_keywords**: Update competitor keywords
    - **polling_frequency_minutes**: Update polling frequency

    Returns the updated profile.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Update only provided fields
    update_data = profile_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile updated: {profile.name} (ID: {profile.id}) by user {current_user_id}")

    return profile


@router.patch("/{profile_id}", response_model=ProfileRead)
def partial_update_profile(
    profile_id: int,
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Partially update a profile (alias for PUT with same behavior).

    Use PATCH for partial updates where only some fields are provided.
    """
    return update_profile(profile_id, profile_data, db, current_user_id)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Delete a profile.

    This permanently removes the profile and all associated data.
    Consider deactivating (is_active=false) instead if you want to preserve history.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    db.delete(profile)
    db.commit()

    logger.info(f"Profile deleted: ID {profile_id} by user {current_user_id}")


# ============================================
# PROFILE MANAGEMENT ENDPOINTS
# ============================================

@router.post("/{profile_id}/clone", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def clone_profile(
    profile_id: int,
    new_name: Optional[str] = Query(None, description="Name for the cloned profile"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Clone an existing profile.

    Creates a copy of the profile with:
    - All configuration settings duplicated
    - Statistics reset to zero
    - New name (defaults to "Copy of [original name]")

    Useful for creating variations of monitoring configurations.
    """
    # Get original profile
    original = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Create cloned profile
    clone_name = new_name or f"Copy of {original.name}"

    cloned_profile = Profile(
        user_id=current_user_id,
        name=clone_name,
        description=original.description,
        is_active=False,  # Clone starts inactive
        keywords=original.keywords.copy() if original.keywords else None,
        subreddits=original.subreddits.copy() if original.subreddits else None,
        competitor_keywords=original.competitor_keywords.copy() if original.competitor_keywords else None,
        polling_frequency_minutes=original.polling_frequency_minutes,
        fetch_limit_per_subreddit=original.fetch_limit_per_subreddit,
        historical_days=original.historical_days,
        enable_sentiment=original.enable_sentiment,
        enable_intent=original.enable_intent,
        enable_pain_detection=original.enable_pain_detection,
        enable_entity_extraction=original.enable_entity_extraction,
        enable_topic_extraction=original.enable_topic_extraction,
        enable_embedding=original.enable_embedding,
        crisis_threshold_multiplier=original.crisis_threshold_multiplier,
        trend_growth_threshold=original.trend_growth_threshold,
        # Reset statistics
        last_fetch_at=None,
        total_posts_fetched=0,
        total_posts_analyzed=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(cloned_profile)
    db.commit()
    db.refresh(cloned_profile)

    logger.info(f"Profile cloned: {original.name} -> {cloned_profile.name} (ID: {cloned_profile.id})")

    return cloned_profile


@router.post("/{profile_id}/activate", response_model=ProfileRead)
def activate_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Activate a profile to start monitoring.

    Sets is_active=true and starts the monitoring process.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    if profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile is already active"
        )

    profile.is_active = True
    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile activated: {profile.name} (ID: {profile.id})")

    return profile


@router.post("/{profile_id}/deactivate", response_model=ProfileRead)
def deactivate_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Deactivate a profile to pause monitoring.

    Sets is_active=false and stops the monitoring process.
    All historical data is preserved.
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile is already inactive"
        )

    profile.is_active = False
    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile deactivated: {profile.name} (ID: {profile.id})")

    return profile


# ============================================
# PROFILE STATISTICS ENDPOINTS
# ============================================

@router.get("/{profile_id}/stats")
def get_profile_stats(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Get statistics for a profile.

    Returns:
    - Total posts fetched
    - Total posts analyzed
    - Last fetch timestamp
    - Configuration summary
    """
    profile = db.exec(
        select(Profile).where(
            Profile.id == profile_id,
            Profile.user_id == current_user_id
        )
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Count related entities (if available)
    from app.models import RedditPost, AIAnalysis, CrisisAlert, Trend

    post_count = db.exec(
        select(RedditPost).where(RedditPost.profile_id == profile_id)
    ).all()

    analysis_count = db.exec(
        select(AIAnalysis).where(AIAnalysis.profile_id == profile_id)
    ).all()

    alert_count = db.exec(
        select(CrisisAlert).where(CrisisAlert.profile_id == profile_id)
    ).all()

    trend_count = db.exec(
        select(Trend).where(Trend.profile_id == profile_id)
    ).all()

    return {
        "profile_id": profile.id,
        "name": profile.name,
        "is_active": profile.is_active,
        "statistics": {
            "total_posts_fetched": profile.total_posts_fetched,
            "total_posts_analyzed": profile.total_posts_analyzed,
            "posts_in_database": len(post_count),
            "analyses_completed": len(analysis_count),
            "crisis_alerts": len(alert_count),
            "trends_detected": len(trend_count),
            "last_fetch_at": profile.last_fetch_at.isoformat() if profile.last_fetch_at else None
        },
        "configuration": {
            "subreddits_count": len(profile.subreddits) if profile.subreddits else 0,
            "keywords_count": len(profile.keywords) if profile.keywords else 0,
            "competitor_keywords_count": len(profile.competitor_keywords) if profile.competitor_keywords else 0,
            "polling_frequency_minutes": profile.polling_frequency_minutes,
            "ai_features_enabled": {
                "sentiment": profile.enable_sentiment,
                "intent": profile.enable_intent,
                "pain_detection": profile.enable_pain_detection,
                "entity_extraction": profile.enable_entity_extraction,
                "topic_extraction": profile.enable_topic_extraction,
                "embedding": profile.enable_embedding
            }
        },
        "timestamps": {
            "created_at": profile.created_at.isoformat(),
            "updated_at": profile.updated_at.isoformat()
        }
    }


@router.get("/summary/all")
def get_all_profiles_summary(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_with_db)
):
    """
    Get a summary of all profiles for the current user.

    Returns aggregate statistics across all profiles:
    - Total profiles (active/inactive)
    - Total posts fetched
    - Total posts analyzed
    """
    profiles = db.exec(
        select(Profile).where(Profile.user_id == current_user_id)
    ).all()

    total_profiles = len(profiles)
    active_profiles = sum(1 for p in profiles if p.is_active)
    total_posts = sum(p.total_posts_fetched for p in profiles)
    total_analyzed = sum(p.total_posts_analyzed for p in profiles)
    total_subreddits = set()
    total_keywords = set()

    for p in profiles:
        if p.subreddits:
            total_subreddits.update(p.subreddits)
        if p.keywords:
            total_keywords.update(p.keywords)

    return {
        "user_id": current_user_id,
        "summary": {
            "total_profiles": total_profiles,
            "active_profiles": active_profiles,
            "inactive_profiles": total_profiles - active_profiles,
            "total_posts_fetched": total_posts,
            "total_posts_analyzed": total_analyzed,
            "unique_subreddits_monitored": len(total_subreddits),
            "unique_keywords_tracked": len(total_keywords)
        },
        "profiles": [
            {
                "id": p.id,
                "name": p.name,
                "is_active": p.is_active,
                "posts_fetched": p.total_posts_fetched,
                "last_fetch_at": p.last_fetch_at.isoformat() if p.last_fetch_at else None
            }
            for p in profiles
        ]
    }
