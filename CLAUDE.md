# CLAUDE.md - Project Instructions

## Project Overview
Reddit AI Marketing Intelligence Platform — a SaaS that monitors Reddit, analyzes posts with GPT-4o-mini, detects crises and trends, and delivers notifications.

## Tech Stack
- **Backend:** FastAPI + SQLModel ORM
- **Database:** PostgreSQL (primary), MongoDB (future), Redis (Celery broker + cache)
- **Background Tasks:** Celery with 3 queues (reddit_monitor, ai_analysis, pipeline)
- **AI:** OpenAI GPT-4o-mini for sentiment, intent, pain points, entities, topics
- **Auth:** JWT tokens with bcrypt password hashing

## Running the Project

### Option A: Docker (recommended)
```bash
docker-compose up -d                    # start everything
docker-compose logs -f api              # watch API logs
docker-compose logs -f celery-beat      # watch scheduler
docker-compose down                     # stop everything
```

### Option B: Local development
```bash
# Start infra only
docker-compose up -d postgres redis mongodb

# Run FastAPI
poetry run uvicorn app.main:app --reload --port 8000

# Run Celery workers (separate terminals)
celery -A app.core.celery_app worker -Q reddit_monitor -c 2 --loglevel=info
celery -A app.core.celery_app worker -Q ai_analysis -c 4 --loglevel=info
celery -A app.core.celery_app worker -Q pipeline -c 2 --loglevel=info

# Run Celery Beat scheduler
celery -A app.core.celery_app beat --loglevel=info
```

## Project Structure
```
app/
├── api/           # FastAPI routers (auth, profiles, posts, analysis, crisis, trends)
├── core/          # Config, security, celery_app
├── database/      # SQLModel engine + session
├── models/        # All SQLModel tables + Pydantic schemas
├── services/      # Business logic (ai_analyzer, crisis_detector, trend_detector, notification_service)
├── tasks/         # Celery tasks (reddit_tasks, ai_tasks, pipeline_tasks, crisis_tasks, trend_tasks)
└── main.py        # FastAPI app entry point

scripts/           # Utility scripts (create_test_data.py, test_ai_analysis.py)
```

## Key Files
- `app/core/config.py` — all env vars (DATABASE_URL, OPENAI_API_KEY, SMTP_*, SLACK_*)
- `app/core/celery_app.py` — Celery config + beat_schedule
- `app/models/models.py` — ALL database models (User, Profile, RedditPost, AIAnalysis, CrisisAlert, Trend, etc.)

## Celery Queues
| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `reddit_monitor` | Fetch posts from Reddit via PRAW | 2 |
| `ai_analysis` | GPT-4o-mini API calls | 4 |
| `pipeline` | Orchestration, crisis, trends | 2 |

## Celery Beat Schedule (automatic, UTC)
- `*/5 min` — smart_refresh_due_profiles (respects each profile's polling_frequency_minutes)
- `:00/hr` — detect_crisis_all_active_profiles
- `:15/hr` — detect_trends_all_active_profiles

## API Authentication
All endpoints except `/api/auth/register` and `/api/auth/login` require a JWT token.
```
Authorization: Bearer <token>
```

Test user (created by scripts/create_test_data.py):
- Email: test@example.com
- Password: testpassword123

## Database
- PostgreSQL on port 5433 (Docker) or 5432 (local)
- Tables auto-created on FastAPI startup via `init_db()`
- Migrations: Alembic (alembic.ini exists)

## Environment Variables (.env)
Required:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `OPENAI_API_KEY` — for AI analysis
- `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT` — for PRAW

Optional (notifications):
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` — email alerts
- `SLACK_WEBHOOK_URL` — Slack alerts

## Code Conventions
- Use SQLModel for all database models (not raw SQLAlchemy)
- All API routes go in `app/api/` with their own router
- All background tasks go in `app/tasks/` and must be registered in `celery_app.py`
- Services contain business logic, tasks just call services
- Use `logger.info()` / `logger.error()` for logging, not print()

## Do NOT
- Hardcode credentials in code (use .env)
- Create new branches without asking (use the designated feature branch)
- Skip Celery task registration in `celery_app.py` includes
- Forget to add new routers to `app/main.py`

## Testing
```bash
python scripts/test_ai_analysis.py   # End-to-end AI analysis test
python scripts/create_test_data.py   # Create test user + profile
```

## Pending Features (P3)
- Competitor Analysis (model exists, needs service + API)
- Customer Language Mining
- Influencer Identification
- Summary Reports (daily/weekly email digests)
- Webhooks
