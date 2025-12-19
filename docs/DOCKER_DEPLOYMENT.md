# Docker Deployment Guide

Deploy the Content Creator application to Render using Docker containers.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed (for local testing)
- [Render](https://render.com/) account
- Repository connected to Render

## Project Structure

```
content_creater-main/
├── Dockerfile.backend    # Python FastAPI backend
├── Dockerfile.frontend   # Next.js frontend
├── docker-compose.yml    # Local development & Render Blueprint
├── render.yaml          # Render deployment configuration
├── .dockerignore        # Files to exclude from Docker build
└── ...
```

## Local Development with Docker

### 1. Create Environment File

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 2. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Stop Services

```bash
docker-compose down
```

## Deploy to Render

### Option 1: Using Render Blueprint (Recommended)

1. **Push to Repository**
   Ensure all Docker files are committed and pushed to your repository.

2. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Select your repository
   - Render will detect `render.yaml`

3. **Configure Environment Variables**
   In the Render Dashboard, set these secrets for each service:
   
   **Backend Service:**
   - `GOOGLE_API_KEY` - Google/Gemini API key
   - `OPENAI_API_KEY` - OpenAI API key
   - `ANTHROPIC_API_KEY` - Anthropic API key
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_KEY` - Supabase anon key
   - `DATABASE_URL` - PostgreSQL connection string
   
   **Frontend Service:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key

4. **Deploy**
   Click "Apply" to deploy both services.

### Option 2: Manual Docker Deployment

1. **Create Web Services**
   - Create two Web Services in Render
   - Set runtime to "Docker"
   - Point to respective Dockerfiles

2. **Configure Each Service**
   - Set environment variables
   - Configure health check paths

## Health Checks

| Service  | Endpoint  | Expected Response |
|----------|-----------|-------------------|
| Backend  | `/health` | JSON status       |
| Frontend | `/`       | HTML page         |

## Troubleshooting

### Build Failures

- Ensure `node_modules` and `.venv` are in `.dockerignore`
- Check Docker build logs for missing dependencies

### Runtime Errors

- Verify all required environment variables are set
- Check service logs in Render dashboard

### Connection Issues

- Ensure `NEXT_PUBLIC_PYTHON_BACKEND_URL` is correctly set
- Backend must be healthy before frontend starts

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Render                            │
│  ┌─────────────────┐    ┌─────────────────────────┐   │
│  │    Frontend     │───▶│       Backend           │   │
│  │   (Next.js)     │    │      (FastAPI)          │   │
│  │   Port: 3000    │    │      Port: 8000         │   │
│  └─────────────────┘    └───────────┬─────────────┘   │
│                                     │                   │
└─────────────────────────────────────┼───────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │    Supabase     │
                            │   (Database)    │
                            └─────────────────┘
```
