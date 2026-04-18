# FastAPI Project with Poetry

Simple FastAPI project using Poetry for dependency management and Uvicorn as the ASGI server.

## Setup

1. **Install Poetry** (if not already installed):
   ```powershell
   (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -
   ```

2. **Install dependencies**:
   ```powershell
   poetry install
   ```

## Run the app

```powershell
poetry run uvicorn app.main:app --reload
```

The app will be at `http://localhost:8000`

- **Root**: `http://localhost:8000/`
- **Health**: `http://localhost:8000/health`
- **Docs**: `http://localhost:8000/docs` (interactive Swagger UI)

## Test

```powershell
poetry run pytest
```

## Quick PowerShell test

```powershell
Invoke-RestMethod http://localhost:8000/
Invoke-RestMethod http://localhost:8000/health
