# Quick Start Guide

## Installation Steps

### 1. Install Dependencies with Poetry

```bash
# Install all dependencies
poetry install

# Or use pip with requirements.txt
pip install -r requirements.txt
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Check if containers are running
docker compose ps

# View logs
docker compose logs -f
```

### 3. Verify Database Connection

```bash
# Test PostgreSQL connection
docker exec -it reddit_postgres psql -U reddit_user -d reddit_db -c "SELECT version();"
```

### 4. Start the Application

**Option A: Using Shell Scripts**

```bash
# Terminal 1: Start API
./run_api.sh

# Terminal 2: Start Celery Worker
./run_celery.sh
```

**Option B: Using Makefile**

```bash
# Terminal 1
make run-api

# Terminal 2
make run-celery
```

**Option C: Manual Commands**

```bash
# Terminal 1: API Server
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Celery Worker
poetry run celery -A app.core.celery_app worker --loglevel=info
```

## First API Calls

### 1. Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "monitored_subreddits": ["AiAutomations", "Python"]
}
```

### 2. Fetch Posts from Reddit

```bash
# Fetch 25 hot posts from r/AiAutomations
curl -X POST http://localhost:8000/api/monitor/fetch-hot-posts \
  -H "Content-Type: application/json" \
  -d '{"subreddit": "AiAutomations", "limit": 25}'
```

Response:
```json
{
  "status": "success",
  "message": "Started fetching 25 hot posts from r/AiAutomations",
  "task_id": "abc123-task-id"
}
```

### 3. Check Task Status

```bash
# Replace {task_id} with the ID from previous response
curl http://localhost:8000/api/monitor/task-status/{task_id}
```

### 4. Get Stored Posts

```bash
# Get all posts
curl http://localhost:8000/api/posts

# Get posts from specific subreddit
curl "http://localhost:8000/api/posts?subreddit=AiAutomations&limit=10"

# Get specific post with comments
curl http://localhost:8000/api/posts/1oq33k6
```

### 5. View Statistics

```bash
curl http://localhost:8000/api/posts/stats/summary
```

## Testing the Full Workflow

```bash
# 1. Fetch posts from multiple subreddits
curl -X POST http://localhost:8000/api/monitor/bulk-fetch \
  -H "Content-Type: application/json" \
  -d '{"subreddits": ["Python", "MachineLearning"], "limit": 10}'

# 2. Wait a few seconds for tasks to complete

# 3. Check database stats
curl http://localhost:8000/api/posts/stats/summary

# 4. Get posts from Python subreddit
curl "http://localhost:8000/api/posts/subreddit/Python"

# 5. Get a specific post (use ID from previous response)
curl http://localhost:8000/api/posts/{post_id}
```

## Using the Interactive API Docs

1. Open browser: http://localhost:8000/docs
2. Try out the endpoints directly from the UI
3. View request/response schemas

## Troubleshooting

### Docker not available?

You can install PostgreSQL and Redis locally:

**PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql

# macOS
brew install postgresql

# Start service
sudo service postgresql start
```

**Redis:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start service
redis-server
```

Then update `.env` with your local connection strings.

### Poetry not found?

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Or via pip
pip install poetry
```

### Celery tasks not running?

1. Make sure Redis is running
2. Check Celery worker logs for errors
3. Verify `CELERY_BROKER_URL` in `.env`

### Database connection failed?

1. Check if PostgreSQL container is running: `docker compose ps`
2. Verify credentials in `.env` match `docker-compose.yml`
3. Check logs: `docker compose logs postgres`

## Development Workflow

```bash
# 1. Start Docker services
make docker-up

# 2. Run API in dev mode (Terminal 1)
make run-api

# 3. Run Celery worker (Terminal 2)
make run-celery

# 4. Make changes to code
# API will auto-reload thanks to --reload flag

# 5. Test your changes
curl http://localhost:8000/api/posts

# 6. Stop services when done
make docker-down
```

## Next Steps

1. Explore the API documentation: http://localhost:8000/docs
2. Check out the full README.md for advanced usage
3. Modify `SUBREDDITS_TO_MONITOR` in `.env` to track your subreddits
4. Add sentiment analysis (see project roadmap)
5. Build a frontend dashboard

## Useful Commands

```bash
# View all Docker containers
docker compose ps

# View PostgreSQL logs
docker compose logs postgres

# View Redis logs
docker compose logs redis

# Access PostgreSQL shell
docker exec -it reddit_postgres psql -U reddit_user -d reddit_db

# Access Redis CLI
docker exec -it reddit_redis redis-cli

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```
