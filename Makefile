.PHONY: help install docker-up docker-down run-api run-celery dev test clean

help:
	@echo "Reddit AI Platform - Available Commands:"
	@echo "  make install      - Install dependencies with Poetry"
	@echo "  make docker-up    - Start PostgreSQL and Redis containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make run-api      - Start FastAPI server"
	@echo "  make run-celery   - Start Celery worker"
	@echo "  make dev          - Start all services (Docker + API + Celery)"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean Python cache files"

install:
	poetry install

docker-up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "PostgreSQL and Redis are running!"

docker-down:
	docker-compose down

run-api:
	poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

run-celery:
	poetry run celery -A app.core.celery_app worker --loglevel=info

dev: docker-up
	@echo "Starting development environment..."
	@echo "Run 'make run-api' in one terminal"
	@echo "Run 'make run-celery' in another terminal"

test:
	poetry run pytest

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
