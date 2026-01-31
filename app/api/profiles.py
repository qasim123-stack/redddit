"""
Profile API endpoints.
CRUD operations for monitoring profiles.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models import Profile, Subreddit, Keyword, CompetitorKeyword
from app.schemas.profile import (
    ProfileCreate,
    ProfileUpdate,
    ProfileResponse,
    ProfileListResponse,
    ProfileStats,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


async def get_or_create_subreddit(db: AsyncSession, name: str) -> Subreddit:
    """Get existing subreddit or create new one."""
    # Normalize name (remove r/ prefix if present)
    name = name.lower().strip()
    if name.startswith("r/"):
        name = name[2:]

    result = await db.execute(
        select(Subreddit).where(Subreddit.name == name)
    )
    subreddit = result.scalar_one_or_none()

    if not subreddit:
        subreddit = Subreddit(name=name)
        db.add(subreddit)
        await db.flush()

    return subreddit


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(
    profile_data: ProfileCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new monitoring profile.

    Example request:
    ```json
    {
        "name": "FastAPI Monitoring",
        "subreddits": ["Python", "FastAPI"],
        "keywords": [{"keyword": "FastAPI"}, {"keyword": "async"}],
        "competitor_keywords": [{"keyword": "Django", "competitor_name": "Django Framework"}],
        "ai_features": {"sentiment_enabled": true, "intent_enabled": true}
    }
    ```
    """
    # Create profile
    profile = Profile(
        name=profile_data.name,
        description=profile_data.description,
        is_active=profile_data.is_active,
        ai_sentiment_enabled=profile_data.ai_features.sentiment_enabled,
        ai_intent_enabled=profile_data.ai_features.intent_enabled,
        ai_entity_enabled=profile_data.ai_features.entity_enabled,
        ai_deep_analysis_enabled=profile_data.ai_features.deep_analysis_enabled,
        ai_competitor_analysis_enabled=profile_data.ai_features.competitor_analysis_enabled,
    )
    db.add(profile)
    await db.flush()

    # Add subreddits
    for subreddit_name in profile_data.subreddits:
        subreddit = await get_or_create_subreddit(db, subreddit_name)
        profile.subreddits.append(subreddit)

    # Add keywords
    for kw_data in profile_data.keywords:
        keyword = Keyword(
            profile_id=profile.id,
            keyword=kw_data.keyword,
            is_regex=kw_data.is_regex,
            case_sensitive=kw_data.case_sensitive,
        )
        db.add(keyword)

    # Add competitor keywords
    for ckw_data in profile_data.competitor_keywords:
        comp_keyword = CompetitorKeyword(
            profile_id=profile.id,
            keyword=ckw_data.keyword,
            competitor_name=ckw_data.competitor_name,
        )
        db.add(comp_keyword)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile.id)
    )
    return result.scalar_one()


@router.get("", response_model=ProfileListResponse)
async def list_profiles(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name"),
    db: AsyncSession = Depends(get_db)
):
    """
    List all profiles with pagination.

    Query parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 10, max: 100)
    - is_active: Filter by active/inactive status
    - search: Search profiles by name
    """
    # Build query
    query = select(Profile).options(
        selectinload(Profile.subreddits),
        selectinload(Profile.keywords),
        selectinload(Profile.competitor_keywords),
    )

    # Apply filters
    if is_active is not None:
        query = query.where(Profile.is_active == is_active)
    if search:
        query = query.where(Profile.name.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count(Profile.id))
    if is_active is not None:
        count_query = count_query.where(Profile.is_active == is_active)
    if search:
        count_query = count_query.where(Profile.name.ilike(f"%{search}%"))

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Profile.created_at.desc())

    result = await db.execute(query)
    profiles = result.scalars().all()

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return ProfileListResponse(
        items=profiles,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific profile by ID."""
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile


@router.put("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: int,
    profile_data: ProfileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a profile.

    Only provided fields will be updated.
    To update subreddits/keywords, provide the complete new list.
    """
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Update basic fields
    if profile_data.name is not None:
        profile.name = profile_data.name
    if profile_data.description is not None:
        profile.description = profile_data.description
    if profile_data.is_active is not None:
        profile.is_active = profile_data.is_active

    # Update AI features
    if profile_data.ai_features is not None:
        profile.ai_sentiment_enabled = profile_data.ai_features.sentiment_enabled
        profile.ai_intent_enabled = profile_data.ai_features.intent_enabled
        profile.ai_entity_enabled = profile_data.ai_features.entity_enabled
        profile.ai_deep_analysis_enabled = profile_data.ai_features.deep_analysis_enabled
        profile.ai_competitor_analysis_enabled = profile_data.ai_features.competitor_analysis_enabled

    # Update subreddits (replace all)
    if profile_data.subreddits is not None:
        profile.subreddits.clear()
        for subreddit_name in profile_data.subreddits:
            subreddit = await get_or_create_subreddit(db, subreddit_name)
            profile.subreddits.append(subreddit)

    # Update keywords (replace all)
    if profile_data.keywords is not None:
        # Delete existing keywords
        await db.execute(
            Keyword.__table__.delete().where(Keyword.profile_id == profile_id)
        )
        # Add new keywords
        for kw_data in profile_data.keywords:
            keyword = Keyword(
                profile_id=profile.id,
                keyword=kw_data.keyword,
                is_regex=kw_data.is_regex,
                case_sensitive=kw_data.case_sensitive,
            )
            db.add(keyword)

    # Update competitor keywords (replace all)
    if profile_data.competitor_keywords is not None:
        await db.execute(
            CompetitorKeyword.__table__.delete().where(
                CompetitorKeyword.profile_id == profile_id
            )
        )
        for ckw_data in profile_data.competitor_keywords:
            comp_keyword = CompetitorKeyword(
                profile_id=profile.id,
                keyword=ckw_data.keyword,
                competitor_name=ckw_data.competitor_name,
            )
            db.add(comp_keyword)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile_id)
    )
    return result.scalar_one()


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a profile and all associated data."""
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    await db.delete(profile)
    await db.commit()


@router.post("/{profile_id}/activate", response_model=ProfileResponse)
async def activate_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Activate a profile (start monitoring)."""
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.is_active = True
    await db.commit()

    return profile


@router.post("/{profile_id}/deactivate", response_model=ProfileResponse)
async def deactivate_profile(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a profile (pause monitoring)."""
    result = await db.execute(
        select(Profile)
        .options(
            selectinload(Profile.subreddits),
            selectinload(Profile.keywords),
            selectinload(Profile.competitor_keywords),
        )
        .where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.is_active = False
    await db.commit()

    return profile


@router.get("/{profile_id}/stats", response_model=ProfileStats)
async def get_profile_stats(
    profile_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a profile."""
    from app.models import RedditPost, AIAnalysis

    # Check profile exists
    result = await db.execute(
        select(Profile).where(Profile.id == profile_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get post counts
    total_posts = await db.execute(
        select(func.count(RedditPost.id)).where(RedditPost.profile_id == profile_id)
    )
    total_posts = total_posts.scalar() or 0

    relevant_posts = await db.execute(
        select(func.count(RedditPost.id)).where(
            RedditPost.profile_id == profile_id,
            RedditPost.is_relevant == True
        )
    )
    relevant_posts = relevant_posts.scalar() or 0

    competitor_posts = await db.execute(
        select(func.count(RedditPost.id)).where(
            RedditPost.profile_id == profile_id,
            RedditPost.has_competitor_mention == True
        )
    )
    competitor_posts = competitor_posts.scalar() or 0

    pending_posts = await db.execute(
        select(func.count(RedditPost.id)).where(
            RedditPost.profile_id == profile_id,
            RedditPost.processing_status == "pending"
        )
    )
    pending_posts = pending_posts.scalar() or 0

    processed_posts = await db.execute(
        select(func.count(RedditPost.id)).where(
            RedditPost.profile_id == profile_id,
            RedditPost.processing_status == "processed"
        )
    )
    processed_posts = processed_posts.scalar() or 0

    # Get sentiment breakdown
    sentiment_query = await db.execute(
        select(AIAnalysis.sentiment, func.count(AIAnalysis.id))
        .join(RedditPost)
        .where(RedditPost.profile_id == profile_id)
        .group_by(AIAnalysis.sentiment)
    )
    sentiment_breakdown = {
        row[0] or "unknown": row[1] for row in sentiment_query.fetchall()
    }

    return ProfileStats(
        profile_id=profile_id,
        total_posts=total_posts,
        relevant_posts=relevant_posts,
        posts_with_competitor_mentions=competitor_posts,
        pending_posts=pending_posts,
        processed_posts=processed_posts,
        sentiment_breakdown=sentiment_breakdown,
    )
