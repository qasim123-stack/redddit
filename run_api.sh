#!/bin/bash

# Start FastAPI server
echo "Starting FastAPI server..."

# Activate Poetry environment and run Uvicorn
poetry run uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info
