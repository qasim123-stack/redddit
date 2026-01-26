"""
Script to create test user and profile for development/testing
Run this once to populate database with test data
"""

from sqlmodel import Session, select
from app.database import engine
from app.models import User, Profile, UserPreferences
from datetime import datetime


def create_test_data():
    """Create test user and profile in database"""

    with Session(engine) as db:
        print("🔍 Checking for existing test user...")

        # Check if test user already exists
        statement = select(User).where(User.email == "test@example.com")
        existing_user = db.exec(statement).first()

        if existing_user:
            print(f"✅ Test user already exists (ID: {existing_user.id})")
            user = existing_user
        else:
            # Create test user
            user = User(
                email="test@example.com",
                full_name="Test User",
                hashed_password="not_a_real_password_hash",  # Not for production!
                is_active=True,
                is_verified=True,
                subscription_tier="free",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"✅ Created test user (ID: {user.id})")

        # Create user preferences
        statement = select(UserPreferences).where(UserPreferences.user_id == user.id)
        existing_prefs = db.exec(statement).first()

        if not existing_prefs:
            prefs = UserPreferences(
                user_id=user.id,
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
            db.add(prefs)
            db.commit()
            print(f"✅ Created user preferences")

        # Check if test profile already exists
        statement = select(Profile).where(Profile.user_id == user.id, Profile.name == "Test Monitoring Profile")
        existing_profile = db.exec(statement).first()

        if existing_profile:
            print(f"✅ Test profile already exists (ID: {existing_profile.id})")
            profile = existing_profile
        else:
            # Create test monitoring profile
            profile = Profile(
                user_id=user.id,
                name="Test Monitoring Profile",
                description="Default profile for testing Reddit monitoring",
                is_active=True,
                keywords=["Python", "AI", "FastAPI", "Machine Learning"],
                subreddits=["Python", "learnpython", "MachineLearning", "artificial"],
                competitor_keywords=["Django", "Flask"],
                polling_frequency_minutes=15,
                fetch_limit_per_subreddit=25,
                historical_days=7,
                enable_sentiment=True,
                enable_intent=True,
                enable_pain_detection=True,
                enable_entity_extraction=True,
                enable_topic_extraction=True,
                enable_embedding=False,
                total_posts_fetched=0,
                total_posts_analyzed=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            print(f"✅ Created test profile (ID: {profile.id})")

        print("\n" + "="*60)
        print("🎉 Test data created successfully!")
        print("="*60)
        print(f"\nUser Details:")
        print(f"  - ID: {user.id}")
        print(f"  - Email: {user.email}")
        print(f"  - Name: {user.full_name}")
        print(f"\nProfile Details:")
        print(f"  - ID: {profile.id}")
        print(f"  - Name: {profile.name}")
        print(f"  - Subreddits: {', '.join(profile.subreddits)}")
        print(f"  - Keywords: {', '.join(profile.keywords)}")
        print("\n" + "="*60)
        print("💡 Use these IDs when testing:")
        print(f"   - user_id={user.id}")
        print(f"   - profile_id={profile.id}")
        print("="*60)

        return user, profile


if __name__ == "__main__":
    print("🚀 Creating test data...\n")
    try:
        user, profile = create_test_data()
    except Exception as e:
        print(f"\n❌ Error creating test data: {e}")
        raise
