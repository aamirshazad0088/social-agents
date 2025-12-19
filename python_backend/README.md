# Python Backend for Content Creator

Python-based AI agent backend using LangGraph and FastAPI.

## Requirements
- Python 3.14+
- uv package manager

## Quick Start

```bash
# Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Copy environment file
cp .env.example .env
# Edit .env with your API keys

# Run development server
uv run uvicorn src.main:app --reload --port 8000
```

## API Documentation
Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure
```
python_backend/
├── pyproject.toml      # Dependencies
├── src/
│   ├── main.py         # FastAPI entry
│   ├── config/         # Settings
│   ├── api/            # Routes
│   ├── schemas/        # Pydantic models
│   ├── services/       # Business logic
│   ├── agents/         # LangGraph agents
│   └── graphs/         # Agent workflows
└── tests/
```
