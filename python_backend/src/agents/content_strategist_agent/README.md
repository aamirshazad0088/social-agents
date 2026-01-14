# Content Strategist Agent

A DeepAgents-based content strategist for social media marketing.

## Folder Structure

```
content_strategist_agent/
├── AGENTS.md              # Brand voice & guidelines (memory)
├── subagents.yaml         # Subagent definitions
├── service.py             # Main entry point
├── schemas.py             # Request/response models
├── prompts.py             # System prompt helpers
│
├── config/                # Configuration & constants
│   └── __init__.py
│
├── tools/                 # Tool definitions
│   ├── __init__.py
│   └── tools.py           # @tool decorated functions
│
├── subagents/             # Subagent loading
│   └── __init__.py
│
├── checkpointer/          # Database persistence
│   └── __init__.py
│
├── utils/                 # Helper functions
│   └── __init__.py
│
└── skills/                # Platform-specific skills
    ├── instagram/SKILL.md
    ├── linkedin/SKILL.md
    ├── twitter/SKILL.md
    ├── tiktok/SKILL.md
    ├── youtube/SKILL.md
    └── content-calendar/SKILL.md
```

## How to Extend

### Adding a New Tool

1. Edit `tools/tools.py`:
```python
@tool
def my_new_tool(param: str) -> str:
    """Tool description."""
    return result
```

2. Add to `tools/__init__.py` exports:
```python
from .tools import my_new_tool
__all__ = [..., "my_new_tool"]
```

3. Add to `service.py` tools list:
```python
tools=[web_search, generate_content_image, my_new_tool],
```

### Adding a New Subagent

1. Edit `subagents.yaml`:
```yaml
my_subagent:
  description: When to use this subagent
  system_prompt: |
    Instructions for the subagent
  tools:
    - web_search
```

2. If the subagent needs a new tool, add to `subagents/__init__.py`:
```python
def get_available_tools():
    return {
        "web_search": web_search,
        "my_new_tool": my_new_tool,  # Add here
    }
```

### Adding a New Skill

1. Create folder: `skills/my-skill/`
2. Create `skills/my-skill/SKILL.md`:
```markdown
---
name: my-skill
description: When to use this skill
---
# My Skill

## When to Use
...

## Process
...
```

### Environment Variables

- `GOOGLE_API_KEY`: Required for Gemini model
- `TAVILY_API_KEY`: Optional, enables web_search tool
- `DATABASE_URL`: PostgreSQL for conversation persistence
