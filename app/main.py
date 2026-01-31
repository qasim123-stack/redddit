"""
Reddit Monitor API - Main FastAPI Application

A Reddit monitoring and intelligence platform that:
1. Monitors specified subreddits for relevant posts
2. Filters posts by keywords
3. Analyzes sentiment, intent, and entities using AI
4. Detects competitor mentions
5. Provides real-time dashboards and alerts
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.api import profiles

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    - On startup: Initialize database tables
    - On shutdown: Clean up resources
    """
    # Startup
    print("Starting Reddit Monitor API...")
    await init_db()
    print("Database initialized.")
    yield
    # Shutdown
    print("Shutting down Reddit Monitor API...")


# Create FastAPI application
app = FastAPI(
    title="Reddit Monitor API",
    description="""
## Reddit Monitoring & Intelligence Platform

Monitor Reddit for brand mentions, analyze sentiment, detect competitors, and get actionable insights.

### Features:
- **Profile Management**: Create monitoring profiles with keywords and subreddits
- **Reddit Data Collection**: Fetch posts from specified subreddits
- **Keyword Filtering**: Filter relevant posts by keywords
- **AI Analysis**: Sentiment, intent, and entity extraction
- **Competitor Detection**: Monitor competitor mentions
- **Aggregation & Trends**: Hourly trend analysis and crisis alerts

### Architecture:
1. Profiles define what to monitor (subreddits, keywords, competitors)
2. Celery Beat triggers data collection every 15 minutes
3. Posts are filtered and saved to PostgreSQL
4. AI pipeline processes posts (sentiment, intent, entities)
5. Hourly aggregation calculates trends and alerts
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(profiles.router, prefix="/api")


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "reddit-monitor-api",
        "version": "1.0.0"
    }


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Reddit Monitor API",
        "docs": "/docs",
        "health": "/health",
        "api": {
            "profiles": "/api/profiles"
        }
    }
