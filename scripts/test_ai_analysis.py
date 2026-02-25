#!/usr/bin/env python3
"""
Full end-to-end test for the AI Analysis pipeline.

What this does:
  1. Creates (or reuses) the test user + profile from create_test_data.py
  2. Inserts 6 realistic dummy Reddit posts with varied content/sentiment
  3. Runs GPT-4o-mini analysis on each post INLINE (no Celery workers needed)
  4. Saves AIAnalysis records to the database
  5. Prints a clean summary of every result
  6. Runs crisis detection on the profile and shows the outcome

Requirements:
  - OPENAI_API_KEY must be set in your .env file
  - DATABASE_URL must be set and the database must be running

Usage:
  python scripts/test_ai_analysis.py
"""

import sys
import os

# Allow running from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from decimal import Decimal
from sqlmodel import Session, select

from app.database import engine, init_db
from app.models import User, Profile, RedditPost, AIAnalysis
from app.services.ai_analyzer import AIAnalyzer, map_analysis_to_db_fields
from scripts.create_test_data import create_test_data

# ============================================================
# Dummy Reddit posts — varied sentiment, intent, and pain points
# ============================================================
DUMMY_POSTS = [
    {
        "reddit_id": "test_post_001",
        "subreddit": "Python",
        "author": "dev_qasim",
        "title": "FastAPI is absolutely amazing for building APIs",
        "selftext": (
            "I just migrated our entire backend from Flask to FastAPI and the "
            "performance improvement is insane. We went from 200ms average response "
            "time down to 30ms. The automatic OpenAPI docs save hours every sprint. "
            "Async support out of the box is a game changer. Highly recommend to anyone "
            "still using Flask for new projects."
        ),
        "score": 342,
        "num_comments": 87,
    },
    {
        "reddit_id": "test_post_002",
        "subreddit": "SaaS",
        "author": "frustrated_founder",
        "title": "Why does every SaaS tool have TERRIBLE documentation?",
        "selftext": (
            "I've been trying to integrate with three different analytics platforms this "
            "week and every single one has docs that are completely out of date. Error "
            "messages that don't exist in the actual API. Code examples that throw "
            "exceptions. I wasted 4 hours debugging an issue that turns out was a typo "
            "in THEIR official documentation. This is unacceptable for a $500/month "
            "product. I'm done paying for tools that can't be bothered to maintain "
            "basic documentation. Looking for alternatives that actually respect "
            "developer time."
        ),
        "score": 891,
        "num_comments": 203,
    },
    {
        "reddit_id": "test_post_003",
        "subreddit": "learnpython",
        "author": "newbie_coder_99",
        "title": "What's the best way to handle database connections in FastAPI?",
        "selftext": (
            "I'm building my first FastAPI project and I'm confused about database "
            "connection management. Should I use a global engine and create sessions "
            "per request? I've seen examples using dependency injection with Depends() "
            "but not sure if that's the recommended approach. My app will have maybe "
            "100 concurrent users max. Currently using PostgreSQL with SQLModel. "
            "Any guidance would be appreciated!"
        ),
        "score": 45,
        "num_comments": 22,
    },
    {
        "reddit_id": "test_post_004",
        "subreddit": "SaaS",
        "author": "angry_enterprise_user",
        "title": "This platform is completely broken - AVOID at all costs",
        "selftext": (
            "We've been dealing with outages EVERY SINGLE DAY for the past two weeks. "
            "Our entire business depends on this tool and they can't keep it running "
            "for more than 6 hours straight. Customer support takes 3 days to respond "
            "with a copy-paste non-answer. We're paying $2000/month for this garbage. "
            "Data corrupted twice already - we had to roll back manually. "
            "Their status page shows 'All Systems Operational' during the outages. "
            "This is fraud. Do NOT use this service for anything critical. "
            "We are actively looking for a replacement and will be filing a chargeback "
            "for the last 3 months of service."
        ),
        "score": 2341,
        "num_comments": 567,
    },
    {
        "reddit_id": "test_post_005",
        "subreddit": "MachineLearning",
        "author": "ml_practitioner",
        "title": "GPT-4o-mini vs Claude Haiku for production NLP pipelines - comparison",
        "selftext": (
            "Been running both models in production for 3 months processing ~50k texts/day. "
            "Here's my honest breakdown:\n\n"
            "GPT-4o-mini: Faster (avg 800ms), cheaper ($0.15/1M tokens), very consistent "
            "JSON output when using response_format. Slightly worse on nuanced sentiment.\n\n"
            "Claude Haiku: Better reasoning on complex texts, handles sarcasm better, "
            "costs ~$0.25/1M tokens. Response times vary more.\n\n"
            "For high-volume structured extraction tasks like ours, GPT-4o-mini wins on "
            "cost-performance. For qualitative analysis or complex intent detection, "
            "Claude Haiku is worth the premium. Happy to share benchmarks."
        ),
        "score": 678,
        "num_comments": 134,
    },
    {
        "reddit_id": "test_post_006",
        "subreddit": "Python",
        "author": "open_source_contributor",
        "title": "Just released an open source Reddit monitoring library",
        "selftext": (
            "Hey everyone, I just published reddit-monitor v1.0 on PyPI. "
            "It wraps PRAW with async support, rate limiting, and automatic retry logic. "
            "Supports streaming, hot posts, and comment monitoring in one unified API. "
            "MIT licensed, fully typed, 95% test coverage. "
            "Would love contributions and feedback from the community!"
        ),
        "score": 156,
        "num_comments": 43,
    },
]


def insert_dummy_posts(db: Session, profile: Profile, user: User) -> list[RedditPost]:
    """Insert dummy posts into DB, skip ones already inserted."""
    posts = []
    for data in DUMMY_POSTS:
        existing = db.exec(
            select(RedditPost).where(RedditPost.reddit_id == data["reddit_id"])
        ).first()

        if existing:
            print(f"  - r/{data['subreddit']} | '{data['title'][:50]}...' (already exists, ID: {existing.id})")
            posts.append(existing)
            continue

        post = RedditPost(
            profile_id=profile.id,
            user_id=user.id,
            reddit_id=data["reddit_id"],
            subreddit=data["subreddit"],
            author=data["author"],
            title=data["title"],
            selftext=data["selftext"],
            url=f"https://reddit.com/r/{data['subreddit']}/comments/{data['reddit_id']}",
            permalink=f"/r/{data['subreddit']}/comments/{data['reddit_id']}",
            score=data["score"],
            num_comments=data["num_comments"],
            created_utc=datetime.utcnow(),
            processing_status="pending",
            is_relevant=True,
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        print(f"  + r/{data['subreddit']} | '{data['title'][:50]}' (ID: {post.id})")
        posts.append(post)

    return posts


def run_analysis(db: Session, posts: list[RedditPost]) -> list[dict]:
    """Run GPT-4o-mini analysis on posts and save to DB."""
    analyzer = AIAnalyzer()
    results = []

    for post in posts:
        # Check if already analyzed
        existing = db.exec(
            select(AIAnalysis).where(AIAnalysis.post_id == post.id)
        ).first()

        if existing:
            print(f"  - Post {post.id} already analyzed, skipping")
            results.append({"post": post, "analysis": existing, "raw": None, "skipped": True})
            continue

        print(f"  Analyzing: '{post.title[:60]}'...")
        try:
            raw = analyzer.analyze_post(
                title=post.title or "",
                body=post.selftext or "",
                subreddit=post.subreddit,
            )

            db_fields = map_analysis_to_db_fields(raw)

            analysis = AIAnalysis(
                post_id=post.id,
                profile_id=post.profile_id,
                **db_fields,
            )
            db.add(analysis)

            # Mark post as analyzed
            post.processing_status = "analyzed"
            post.processed_at = datetime.utcnow()
            db.add(post)

            db.commit()
            db.refresh(analysis)

            meta = raw.get("_meta", {})
            print(
                f"    Sentiment: {db_fields['sentiment_label']} ({float(db_fields['sentiment_score']):+.2f}) | "
                f"Intent: {db_fields['intent_label']} | "
                f"Pain: {'YES' if db_fields['has_pain_point'] else 'no'} | "
                f"Tokens: {meta.get('total_tokens', '?')} | "
                f"{meta.get('processing_time_ms', '?')}ms"
            )

            results.append({"post": post, "analysis": analysis, "raw": raw, "skipped": False})

        except Exception as e:
            print(f"    ERROR: {e}")
            results.append({"post": post, "analysis": None, "raw": None, "error": str(e)})

    return results


def print_summary(results: list[dict]):
    """Print a detailed human-readable summary of analysis results."""
    print("\n" + "=" * 70)
    print("ANALYSIS RESULTS SUMMARY")
    print("=" * 70)

    for r in results:
        post = r["post"]
        analysis = r["analysis"]

        print(f"\nPost ID: {post.id} | r/{post.subreddit}")
        print(f"Title: {post.title}")

        if not analysis:
            print(f"  ERROR: {r.get('error', 'unknown error')}")
            continue

        print(f"  Sentiment   : {analysis.sentiment_label} (score: {float(analysis.sentiment_score or 0):+.3f})")
        print(f"  Emotion     : {analysis.emotion} ({float(analysis.emotion_score or 0):.2f})")
        print(f"  Intent      : {analysis.intent_label} ({float(analysis.intent_score or 0):.2f})")
        print(f"  Topics      : {', '.join(analysis.topics or [])}")
        print(f"  Keywords    : {', '.join((analysis.extracted_keywords or [])[:5])}")

        if analysis.has_pain_point:
            print(f"  Pain Point  : {analysis.pain_point_category} ({analysis.pain_point_severity})")
            if analysis.pain_point_phrases:
                for phrase in analysis.pain_point_phrases[:2]:
                    print(f"    - \"{phrase[:80]}\"")

        if r.get("raw"):
            entities = r["raw"].get("entities", {})
            all_entities = (
                entities.get("products", []) +
                entities.get("technologies", []) +
                entities.get("companies", [])
            )
            if all_entities:
                print(f"  Entities    : {', '.join(all_entities[:6])}")

            customer_lang = r["raw"].get("customer_language", [])
            if customer_lang:
                print(f"  Cust. Lang  : \"{customer_lang[0][:80]}\"")

        print()


def run_crisis_check(profile_id: int):
    """Run crisis detection and show the result."""
    print("=" * 70)
    print("CRISIS DETECTION CHECK")
    print("=" * 70)
    print(f"Running crisis detection for profile {profile_id}...")

    from app.services.crisis_detector import detect_crisis_for_profile
    result = detect_crisis_for_profile(profile_id)

    if result is None:
        print("\nNo crisis detected.")
        print("(Need at least 5 analyzed posts AND a negative spike above threshold)")
        print("This is expected with a fresh profile — baseline comparison needs history.")
    else:
        print(f"\nCRISIS DETECTED!")
        print(f"  Alert ID    : {result['alert_id']}")
        print(f"  Severity    : {result['severity'].upper()}")
        print(f"  Spike       : {result['spike_multiplier']}x above baseline")
        print(f"  Negatives   : {result['current_negative']} / {result['current_total']} posts")

    print()


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Reddit AI Platform — End-to-End Analysis Test")
    print("=" * 70)

    # Step 1: Initialize DB tables
    print("\n[1/4] Initializing database...")
    try:
        init_db()
        print("Database tables ready.")
    except Exception as e:
        print(f"DB init warning (tables may already exist): {e}")

    # Step 2: Create test user + profile
    print("\n[2/4] Creating test user and profile...")
    try:
        user, profile = create_test_data()
    except Exception as e:
        print(f"ERROR creating test data: {e}")
        sys.exit(1)

    # Step 3: Insert dummy posts + run analysis in a single session
    print(f"\n[3/4] Inserting dummy Reddit posts...")

    with Session(engine) as db:
        # Re-fetch to avoid session detachment issues
        user = db.exec(select(User).where(User.email == "test@example.com")).first()
        profile = db.exec(
            select(Profile).where(
                Profile.user_id == user.id,
                Profile.name == "Test Monitoring Profile"
            )
        ).first()
        posts = insert_dummy_posts(db, profile, user)
        post_ids = [p.id for p in posts]

    # Step 4: Run AI analysis (fresh session)
    print(f"\n[4/4] Running GPT-4o-mini analysis on {len(post_ids)} posts...")
    print("(This makes real OpenAI API calls — ~6 requests)\n")

    with Session(engine) as db:
        posts = db.exec(
            select(RedditPost).where(RedditPost.id.in_(post_ids))
        ).all()
        results = run_analysis(db, posts)

    # Print full summary
    print_summary(results)

    # Run crisis detection
    run_crisis_check(profile.id)

    print("=" * 70)
    print("Test complete!")
    print(f"  User ID    : {user.id}  (email: {user.email})")
    print(f"  Profile ID : {profile.id}  (name: {profile.name})")
    print(f"  Posts      : {len(posts)}")
    analyzed = sum(1 for r in results if r.get("analysis") and not r.get("skipped"))
    print(f"  Analyzed   : {analyzed} new")
    print("=" * 70)
    print()
    print("You can now test the API endpoints:")
    print(f"  GET  /api/analysis/profiles/{profile.id}/sentiment-summary")
    print(f"  GET  /api/analysis/profiles/{profile.id}/pain-points")
    print(f"  GET  /api/crisis/profiles/{profile.id}/alerts")
    print(f"  GET  /api/crisis/notifications")
    print()
    print("To get a JWT token for API testing:")
    print("  POST /api/auth/login")
    print('  Body: {"email": "test@example.com", "password": "testpassword123"}')
    print()
    print("NOTE: The test user has a non-functional password hash.")
    print("      Use the register endpoint to create a real account for API testing.")
