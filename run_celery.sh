#!/bin/bash

# Start Celery worker for Reddit monitoring
echo "Starting Celery worker..."

# Activate Poetry environment and run Celery
poetry run celery -A app.core.celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=100 \
    --pool=prefork

# Alternative with specific queue
# poetry run celery -A app.core.celery_app worker -Q reddit_monitor --loglevel=info
