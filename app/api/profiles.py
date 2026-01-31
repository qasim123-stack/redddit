"""Profile Management API endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_db
from app.models import Profile, ProfileCreate, ProfileRead, ProfileUpdate, User
from app.core.security import get_current_user, oauth2_scheme, decode_access_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def get_authenticated_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user with database session.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    statement = select(User).where(User.id == int(user_id))
    user = db.exec(statement).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


@router.post("/", response_model=ProfileRead, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_data: ProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Create a new monitoring profile.

    - **name**: Profile name (required)
    - **description**: Profile description
    - **subreddits**: List of subreddits to monitor
    - **keywords**: List of keywords to track
    - **competitor_keywords**: List of competitor keywords
    - **polling_frequency_minutes**: How often to fetch (min: 5)
    - **enable_sentiment**: Enable sentiment analysis
    - **enable_intent**: Enable intent detection
    - **enable_pain_detection**: Enable pain point detection
    - **enable_entity_extraction**: Enable entity extraction
    - **enable_topic_extraction**: Enable topic extraction
    - **enable_embedding**: Enable embeddings for semantic search

    Returns:
    - Created profile with ID and timestamps
    """
    # Create new profile with user_id from authenticated user
    new_profile = Profile(
        **profile_data.model_dump(),
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    logger.info(f"Profile created: {new_profile.name} (ID: {new_profile.id}) by user {current_user.id}")

    return new_profile


@router.get("/", response_model=List[ProfileRead])
def list_profiles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of profiles to return"),
    offset: int = Query(0, ge=0, description="Number of profiles to skip")
):
    """
    List all profiles for the current user.

    - **is_active**: Optional filter by active status
    - **limit**: Maximum number of profiles to return (default: 50, max: 100)
    - **offset**: Number of profiles to skip for pagination

    Returns:
    - List of profiles belonging to the current user
    """
    statement = select(Profile).where(Profile.user_id == current_user.id)

    # Apply active filter if provided
    if is_active is not None:
        statement = statement.where(Profile.is_active == is_active)

    # Apply ordering and pagination
    statement = statement.order_by(Profile.created_at.desc()).offset(offset).limit(limit)

    profiles = db.exec(statement).all()

    logger.info(f"Listed {len(profiles)} profiles for user {current_user.id}")

    return profiles


@router.get("/{profile_id}", response_model=ProfileRead)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Get a specific profile by ID.

    - **profile_id**: Profile ID to retrieve

    Returns:
    - Profile details

    Raises:
    - 404 if profile not found
    - 403 if profile belongs to another user
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Check ownership
    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this profile"
        )

    return profile


@router.put("/{profile_id}", response_model=ProfileRead)
def update_profile(
    profile_id: int,
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Update a profile by ID.

    - **profile_id**: Profile ID to update
    - Only provided fields will be updated

    Returns:
    - Updated profile

    Raises:
    - 404 if profile not found
    - 403 if profile belongs to another user
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Check ownership
    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this profile"
        )

    # Update only provided fields
    update_data = profile_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile updated: {profile.name} (ID: {profile.id}) by user {current_user.id}")

    return profile


@router.patch("/{profile_id}", response_model=ProfileRead)
def partial_update_profile(
    profile_id: int,
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Partially update a profile by ID (PATCH).

    Same as PUT but explicitly for partial updates.

    - **profile_id**: Profile ID to update
    - Only provided fields will be updated

    Returns:
    - Updated profile
    """
    return update_profile(profile_id, profile_update, db, current_user)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Delete a profile by ID.

    - **profile_id**: Profile ID to delete

    Returns:
    - 204 No Content on success

    Raises:
    - 404 if profile not found
    - 403 if profile belongs to another user
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    # Check ownership
    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this profile"
        )

    db.delete(profile)
    db.commit()

    logger.info(f"Profile deleted: ID {profile_id} by user {current_user.id}")


@router.post("/{profile_id}/activate", response_model=ProfileRead)
def activate_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Activate a profile to start monitoring.

    - **profile_id**: Profile ID to activate

    Returns:
    - Updated profile with is_active=True
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this profile"
        )

    profile.is_active = True
    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile activated: {profile.name} (ID: {profile.id}) by user {current_user.id}")

    return profile


@router.post("/{profile_id}/deactivate", response_model=ProfileRead)
def deactivate_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Deactivate a profile to pause monitoring.

    - **profile_id**: Profile ID to deactivate

    Returns:
    - Updated profile with is_active=False
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this profile"
        )

    profile.is_active = False
    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    logger.info(f"Profile deactivated: {profile.name} (ID: {profile.id}) by user {current_user.id}")

    return profile


@router.get("/{profile_id}/stats", response_model=dict)
def get_profile_stats(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_authenticated_user)
):
    """
    Get statistics for a profile.

    - **profile_id**: Profile ID to get stats for

    Returns:
    - Profile statistics including posts fetched, analyzed, etc.
    """
    statement = select(Profile).where(Profile.id == profile_id)
    profile = db.exec(statement).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )

    if profile.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this profile"
        )

    return {
        "profile_id": profile.id,
        "profile_name": profile.name,
        "is_active": profile.is_active,
        "total_posts_fetched": profile.total_posts_fetched,
        "total_posts_analyzed": profile.total_posts_analyzed,
        "last_fetch_at": profile.last_fetch_at,
        "subreddits_count": len(profile.subreddits) if profile.subreddits else 0,
        "keywords_count": len(profile.keywords) if profile.keywords else 0,
        "competitor_keywords_count": len(profile.competitor_keywords) if profile.competitor_keywords else 0,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at
    }
