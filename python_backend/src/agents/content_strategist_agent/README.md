# Content Strategist Agent

An expert social media content writer and strategist agent built with **DeepAgents** and **LangChain**. Creates professional, platform-optimized content using dynamic skills and a conversational interface.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTENT STRATEGIST AGENT                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │    AGENTS.md    │    │   Skills (8)    │    │  Subagents (2)  │     │
│  │  (System Prompt)│    │  (On-demand)    │    │  (Delegation)   │     │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘     │
│           │                      │                      │               │
│           ▼                      ▼                      ▼               │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │                      DeepAgents Core                           │     │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐    │     │
│  │  │ Memory  │  │  Tools  │  │ Checkptr │  │  Streaming   │    │     │
│  │  │ (Files) │  │  (12)   │  │ (Postgres)│  │  (Messages)  │    │     │
│  │  └─────────┘  └─────────┘  └──────────┘  └──────────────┘    │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
content_strategist_agent/
│
├── AGENTS.md              # System prompt - Brand context, workflows, guidelines
├── README.md              # This documentation file
├── __init__.py            # Package exports
├── service.py             # Main service - Agent creation & streaming
├── schemas.py             # Pydantic models for API requests
├── prompts.py             # Prompt templates (if needed)
├── middleware.py          # SkillMiddleware for progressive disclosure
├── subagents.yaml         # Subagent definitions (researcher, content_editor)
│
├── config/                # Configuration
│   └── __init__.py        # SUBAGENTS_YAML_PATH, memory files, skills dirs
│
├── tools/                 # Agent tools
│   ├── __init__.py        # Tool exports
│   ├── tools.py           # web_search
│   ├── calendar_tools.py  # Calendar CRUD (8 tools)
│   └── skill_tools.py     # load_skill (dynamic skill loading)
│
├── skills/                # Dynamic skills (progressive disclosure)
│   ├── __init__.py        # Skills registry & get_skill()
│   ├── types.py           # Skill TypedDict
│   ├── instagram.py       # Instagram content expertise
│   ├── linkedin.py        # LinkedIn content expertise
│   ├── twitter.py         # Twitter/X content expertise
│   ├── tiktok.py          # TikTok content expertise
│   ├── youtube.py         # YouTube content expertise
│   ├── facebook.py        # Facebook content expertise
│   ├── google_imagen.py   # Imagen 4 image prompt expertise
│   └── google_veo.py      # Veo 3 video prompt expertise
│
├── subagents/             # Subagent loader
│   └── __init__.py        # load_subagents(), wires tools from YAML
│
├── checkpointer/          # Memory persistence
│   └── __init__.py        # PostgreSQL checkpointer for conversation history
│
├── middleware/            # Request/response middleware
│   └── __init__.py        # (Optional) Additional middleware
│
└── utils/                 # Helper functions
    └── __init__.py        # build_multimodal_content()
```

---

## Key Components

### 1. AGENTS.md (System Prompt)

The agent's "brain" - defines:
- **Brand Context**: Identity, writing style, expertise (user-editable)
- **Core Workflow**: AI Post Writing process
- **Content Creation**: Step-by-step process
- **Available Tools**: Complete tool reference

### 2. Skills (Dynamic Loading)

Skills provide **on-demand expertise** via `load_skill()`:

| Category | Skills | Purpose |
|----------|--------|---------|
| **Platform** | instagram, linkedin, twitter, tiktok, youtube, facebook | Social media content writing |
| **Media** | google_imagen, google_veo | AI image/video prompt optimization |

**Pattern**: Agent calls `load_skill("instagram")` → Gets hooks, structures, hashtag strategies, examples.

### 3. Tools

| Tool | Category | Description |
|------|----------|-------------|
| `load_skill` | Skills | Load platform/media expertise on-demand |
| `web_search` | Research | Search web for trends and information |
| `get_today_entries` | Calendar | View today's schedule |
| `get_tomorrow_entries` | Calendar | View tomorrow's schedule |
| `get_week_calendar` | Calendar | View full week |
| `add_calendar_entry` | Calendar | Add single entry |
| `add_weekly_content_plan` | Calendar | Add full week at once |
| `find_and_update_entry` | Calendar | Modify by title/date/platform |
| `find_and_delete_entry` | Calendar | Remove entries |
| `clear_day` | Calendar | Clear all entries for a day |

### 4. Subagents

Specialized agents for delegated tasks:

| Subagent | Purpose | Tools |
|----------|---------|-------|
| `researcher` | Research topics before content creation | web_search |
| `content_editor` | Review and improve drafted content | - |

### 5. Checkpointer

PostgreSQL-based conversation persistence:
- Stores message history per `thread_id`
- Enables multi-turn conversations
- Maintains context across sessions

---

## Data Flow

```
1. User Message → API Endpoint (/api/content-strategist/stream)
                      │
2. ChatStrategistRequest (thread_id, workspace_id, message)
                      │
3. service.py: content_strategist_chat()
   ├── Set workspace_id for calendar tools
   ├── Get/create agent (singleton pattern)
   └── Stream response via astream(stream_mode="messages")
                      │
4. Agent Processing
   ├── Load AGENTS.md as system prompt
   ├── Load any required skills (load_skill tool)
   ├── Use tools as needed (calendar, web_search)
   └── Generate streaming response
                      │
5. Response Filtering
   ├── Skip ToolMessages (raw tool output)
   ├── Skip tool_call chunks
   └── Stream only AIMessageChunks
                      │
6. Streamed Response → Frontend (SSE)
```

---

## Adding New Skills

### Step 1: Create Skill File

```python
# skills/new_platform.py
from .types import Skill

NEW_PLATFORM_SKILL: Skill = {
    "name": "new_platform",
    "description": "Expert for NewPlatform content...",
    "content": """# NewPlatform Expert Guide
    
## PLATFORM OVERVIEW
...

## HOOK FORMULAS
...

## EXAMPLE TRANSFORMATION
**Before**: "..."
**After**: "..."
"""
}
```

### Step 2: Register in skills/__init__.py

```python
from .new_platform import NEW_PLATFORM_SKILL

SKILLS: list[Skill] = [
    # ... existing skills
    NEW_PLATFORM_SKILL,
]

__all__ = [
    # ... existing exports
    "NEW_PLATFORM_SKILL",
]
```

### Step 3: Update Documentation

Add to `AGENTS.md` under Available Tools:
```markdown
- `new_platform` - NewPlatform content expertise
```

---

## Adding New Tools

### Step 1: Create Tool Function

```python
# tools/new_tool.py
from langchain_core.tools import tool

@tool
def new_tool(param: str) -> str:
    """Tool description for the LLM.
    
    Args:
        param: Description of parameter
    
    Returns:
        Description of return value
    """
    # Implementation
    return result
```

### Step 2: Export in tools/__init__.py

```python
from .new_tool import new_tool

__all__ = [
    # ... existing tools
    "new_tool",
]
```

### Step 3: Add to service.py

```python
from .tools import (
    # ... existing imports
    new_tool,
)

_agent = create_deep_agent(
    ...
    tools=[
        # ... existing tools
        new_tool,
    ],
)
```

---

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google AI API key for Gemini model |
| `SUPABASE_URL` | Supabase project URL (for database) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `DATABASE_URL` | PostgreSQL connection URL (for checkpointer) |

### Model Configuration

In `service.py`:
```python
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.7,  # Adjust for creativity
)
```

---

## API Endpoints

### Stream Chat
```
POST /api/content-strategist/stream
Content-Type: application/json

{
  "threadId": "uuid",
  "workspaceId": "uuid",
  "message": "Write me an Instagram post about...",
  "contentBlocks": []  // Optional: images, files
}
```

Response: Server-Sent Events (SSE) stream

---

## Testing

### Manual Testing
```bash
# Ask for platform-specific content
"Write me an Instagram post about productivity"

# Test skill loading
"Load the twitter skill and write a viral tweet"

# Test calendar tools
"What's on my calendar this week?"
"Add a YouTube video for tomorrow at 3pm"
```

### Verify Skills Loading
Check logs for:
```
Content strategist deep agent created
Loaded skill: instagram
```

---

## Troubleshooting

### Agent Not Responding
1. Check `GOOGLE_API_KEY` is set
2. Verify backend is running: `uv run uvicorn src.main:app --reload`
3. Check logs for errors

### Skills Not Loading
1. Verify skill exists in `skills/__init__.py`
2. Check spelling (lowercase: "instagram" not "Instagram")
3. Look for import errors in logs

### Calendar Tools Not Working
1. Ensure `workspaceId` is passed in request
2. Check Supabase connection
3. Verify `content_calendar_entries` table exists

---

## Future Improvements

- [ ] Add more platform skills (Pinterest, Threads, etc.)
- [ ] Implement content templates tool
- [ ] Add A/B testing suggestions
- [ ] Integrate analytics data
- [ ] Add brand voice learning from examples
- [ ] Multi-language content support

---

## Dependencies

```
deepagents
langchain-google-genai
langchain-core
supabase
psycopg[pool]
pyyaml
```

---

## Related Files

- `/src/components/content/ContentStrategistView/` - Frontend component
- `/src/api/routes/content_strategist.py` - API routes
- `/supabase/migrations/` - Database migrations
