# Reddit AI Marketing & Intelligence Platform

A FastAPI-based platform for monitoring Reddit posts and comments in real-time, powered by PRAW, SQLAlchemy, and Celery.

## Features

- Real-time Reddit monitoring using PRAW
- Background task processing with Celery
- PostgreSQL database for storing posts and comments
- RESTful API with FastAPI
- Async support for high performance
- Docker Compose for easy deployment

## Tech Stack

- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **Celery** - Distributed task queue
- **PostgreSQL** - Database
- **Redis** - Message broker & cache
- **PRAW** - Python Reddit API Wrapper
- **Poetry** - Dependency management

## Project Structure

```
redddit/
├── app/
│   ├── api/              # API endpoints
│   │   ├── posts.py      # Post-related endpoints
│   │   └── monitoring.py # Monitoring control endpoints
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings
│   │   └── celery_app.py # Celery configuration
│   ├── database/         # Database setup
│   │   └── connection.py # DB session management
│   ├── models/           # SQLAlchemy models
│   │   ├── post.py       # Post model
│   │   └── comment.py    # Comment model
│   ├── schemas/          # Pydantic schemas
│   │   ├── post.py       # Post schemas
│   │   └── comment.py    # Comment schemas
│   ├── services/         # Business logic
│   │   └── reddit_monitor.py # Reddit monitoring service
│   ├── tasks/            # Celery tasks
│   │   └── reddit_tasks.py # Reddit monitoring tasks
│   └── main.py           # FastAPI application
├── docker-compose.yml    # Docker services
├── pyproject.toml        # Poetry dependencies
├── .env                  # Environment variables
└── README.md
```

## Quick Start

### 1. Prerequisites

- Python 3.10+
- Poetry
- Docker & Docker Compose

### 2. Installation

```bash
# Clone the repository
cd redddit

# Install dependencies
poetry install

# Copy environment file
cp .env.example .env

# Edit .env with your Reddit API credentials
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Or use Makefile
make docker-up
```

### 4. Run the Application

**Terminal 1 - FastAPI Server:**
```bash
poetry run uvicorn app.main:app --reload
# Or: make run-api
```

**Terminal 2 - Celery Worker:**
```bash
poetry run celery -A app.core.celery_app worker --loglevel=info
# Or: make run-celery
```

### 5. Access the Application

- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health
- **pgAdmin**: http://localhost:5050 (admin@admin.com / admin)

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed health status

### Posts
- `GET /api/posts` - Get posts with filtering
- `GET /api/posts/{post_id}` - Get specific post with comments
- `GET /api/posts/{post_id}/comments` - Get post comments
- `GET /api/posts/subreddit/{subreddit_name}` - Get subreddit posts
- `GET /api/posts/stats/summary` - Get database statistics

### Monitoring
- `POST /api/monitor/fetch-hot-posts` - Fetch hot posts from subreddit
- `POST /api/monitor/fetch-comments` - Fetch comments for a post
- `GET /api/monitor/task-status/{task_id}` - Check Celery task status
- `GET /api/monitor/monitored-subreddits` - Get monitored subreddits
- `POST /api/monitor/bulk-fetch` - Fetch from multiple subreddits

## Usage Examples

### Fetch Hot Posts from a Subreddit

```bash
curl -X POST "http://localhost:8000/api/monitor/fetch-hot-posts" \
  -H "Content-Type: application/json" \
  -d '{"subreddit": "AiAutomations", "limit": 25}'
```

### Get Posts

```bash
# Get all posts
curl "http://localhost:8000/api/posts"

# Filter by subreddit
curl "http://localhost:8000/api/posts?subreddit=AiAutomations&limit=10"

# Get posts from last 24 hours with min score
curl "http://localhost:8000/api/posts?hours_ago=24&min_score=5"
```

### Get Specific Post with Comments

```bash
curl "http://localhost:8000/api/posts/1oq33k6"
```

### Bulk Fetch from Multiple Subreddits

```bash
curl -X POST "http://localhost:8000/api/monitor/bulk-fetch" \
  -H "Content-Type: application/json" \
  -d '{"subreddits": ["Python", "MachineLearning", "AiAutomations"], "limit": 10}'
```

## Environment Variables

```env
# Application
APP_NAME=Reddit AI Platform
DEBUG=True

# Database
DATABASE_URL=postgresql://reddit_user:reddit_password@localhost:5432/reddit_db

# Redis & Celery
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0

# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=your_user_agent

# Monitoring
SUBREDDITS_TO_MONITOR=AiAutomations,Python,MachineLearning
```

## Development

### Run Tests

```bash
poetry run pytest
# Or: make test
```

### Clean Cache

```bash
make clean
```

### Database Management

```bash
# Access PostgreSQL via Docker
docker exec -it reddit_postgres psql -U reddit_user -d reddit_db

# Or use pgAdmin at http://localhost:5050
```

## Celery Tasks

### Available Tasks

1. **fetch_hot_posts_task** - Fetch hot posts from a subreddit
2. **fetch_post_comments_task** - Fetch all comments for a post
3. **monitor_subreddit_stream** - Real-time monitoring (experimental)

### Monitor Celery Tasks

```bash
# Check task status
curl "http://localhost:8000/api/monitor/task-status/{task_id}"
```

## Docker Services

### PostgreSQL
- Port: 5432
- User: reddit_user
- Password: reddit_password
- Database: reddit_db

### Redis
- Port: 6379

### pgAdmin
- Port: 5050
- Email: admin@admin.com
- Password: admin

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres
```

### Celery Not Processing Tasks

```bash
# Check Redis connection
docker-compose logs redis

# Restart Celery worker
# Ctrl+C in terminal, then restart with make run-celery
```

### Reddit API Rate Limits

PRAW automatically handles rate limiting. If you see delays, it's normal Reddit API behavior.

## Next Steps

1. Add sentiment analysis with transformers
2. Implement GPT-4 reply generation
3. Build frontend dashboard
4. Add WebSocket for real-time updates
5. Implement trend detection algorithms
6. Add user authentication

## License

MIT

## Contributing

Pull requests are welcome!
