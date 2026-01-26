"""Authentication API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_db
from app.models import User, UserPreferences
from app.schemas.auth import UserRegister, UserLogin, AuthResponse, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user

    - **email**: Valid email address (must be unique)
    - **password**: Password (min 8 characters)
    - **full_name**: Optional full name

    Returns:
    - User information
    - JWT access token for immediate login
    """
    # Check if user already exists
    statement = select(User).where(User.email == user_data.email)
    existing_user = db.exec(statement).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password
    hashed_password = get_password_hash(user_data.password)

    # Create new user
    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_active=True,
        is_verified=False,  # Email verification can be added later
        subscription_tier="free",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default user preferences
    preferences = UserPreferences(
        user_id=new_user.id,
        notification_email=True,
        notification_in_app=True,
        notification_crisis_alerts=True,
        notification_daily_summary=True,
        notification_trending_topics=True,
        theme="light",
        timezone="UTC",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(preferences)
    db.commit()

    # Create JWT token
    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    logger.info(f"New user registered: {new_user.email} (ID: {new_user.id})")

    return AuthResponse(
        user=UserResponse.model_validate(new_user),
        access_token=access_token,
        token_type="bearer"
    )


@router.post("/login", response_model=AuthResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password

    - **email**: User's email address
    - **password**: User's password

    Returns:
    - User information
    - JWT access token
    """
    # Find user by email
    statement = select(User).where(User.email == credentials.email)
    user = db.exec(statement).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create JWT token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    logger.info(f"User logged in: {user.email} (ID: {user.id})")

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(token: str, db: Session = Depends(get_db)):
    """
    Get current user information from JWT token

    - **Authorization**: Bearer token in header

    Returns:
    - Current user information
    """
    from app.core.security import decode_access_token

    # Decode token
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # Get user from database
    statement = select(User).where(User.id == int(user_id))
    user = db.exec(statement).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse.model_validate(user)
