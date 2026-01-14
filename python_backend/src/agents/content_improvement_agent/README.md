# Content Improvement Agent

**AI-powered social media content optimization using LangChain Skills Pattern.**

---

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Complete Workflow](#complete-workflow)
5. [File Reference](#file-reference)
6. [Skills System](#skills-system)
7. [API Reference](#api-reference)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This agent improves user content descriptions for social media platforms while **preserving their original message and voice**.

### What It Does
```
Input:  "Check out our new product!"
Output: "This changed my morning routine forever ☀️

         I used to waste 30 minutes every morning until I discovered this game-changer.

         Save this and thank me later 📌
         
         #morningroutine #productivity #lifehack"
```

### Key Principle
**IMPROVE, don't replace** - The agent enhances the user's content by adding hooks, formatting, and platform optimization while keeping their original message at the center.

### Supported Platforms
| Platform | Skill Name | 2025 Focus |
|----------|------------|------------|
| Instagram | `instagram` | Hooks, hashtags, Reels, Carousels |
| Facebook | `facebook` | Reels, Groups, community engagement |
| Twitter/X | `twitter` | Threads (63% more reach), viral tweets |
| LinkedIn | `linkedin` | Thought leadership, professional tone |
| TikTok | `tiktok` | First 1-3 second hooks, Gen-Z tone |
| YouTube | `youtube` | SEO descriptions, Shorts under 40 chars |

---

## Quick Start

### Testing the API
```bash
# From python_backend directory
curl -X POST http://localhost:8000/api/v1/content/improve \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Check out our new product launch!",
    "platform": "instagram",
    "postType": "post"
  }'
```

### Expected Response
```json
{
  "success": true,
  "improvedDescription": "This product just changed everything for me 🔥\n\nHere's what happened when I tried it...\n\n#newproduct #launch #musthave",
  "metadata": {
    "platform": "instagram",
    "postType": "post"
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EditPostModal.tsx                                                          │
│  • User edits post content                                                  │
│  • Clicks "Improve with AI" button                                          │
│  • Modal appears for instructions                                           │
│       │                                                                     │
│       ▼                                                                     │
│  POST /py-api/content/improve                                               │
│                                                                             │
└───────┼─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS REWRITE (Proxy)                             │
│                                                                               │
│  File: next.config.mjs (line 57-58)                                          │
│                                                                               │
│  source: '/py-api/:path*'                                                    │
│  destination: ${PYTHON_BACKEND_URL}/api/v1/:path*                            │
│                                                                               │
└───────┼───────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           PYTHON BACKEND (FastAPI)                            │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. API Route receives request                                               │
│     └─► api/v1/content_improvement.py                                        │
│         Route: POST /api/v1/content/improve                                  │
│                                                                               │
│  2. Calls service function                                                   │
│     └─► improve_content_description(request)  [service.py]                   │
│                                                                               │
│  3. Builds system prompt with skill routing                                  │
│     └─► build_improvement_system_prompt()  [prompts.py]                      │
│         • Emphasizes: PRESERVE user's message, ENHANCE with platform hooks   │
│         • e.g., platform="instagram" → skill="instagram"                     │
│                                                                               │
│  4. Creates LLM instance                                                     │
│     └─► ChatGoogleGenerativeAI(model="gemini-2.5-pro")                       │
│                                                                               │
│  5. Creates agent with middleware                                            │
│     └─► create_agent(middleware=[SkillMiddleware()])                         │
│         • SkillMiddleware registers load_skill tool                          │
│         • SkillMiddleware injects available platform skills into prompt      │
│                                                                               │
│  6. Agent processes the request                                              │
│     └─► agent.ainvoke()                                                      │
│         • Agent reads system prompt                                          │
│         • Agent calls load_skill("instagram") to get 2025 best practices     │
│         • Agent applies hooks, formatting, hashtags from skill               │
│         • Agent returns improved content                                     │
│                                                                               │
│  7. Extract and return response                                              │
│     └─► ImproveContentResponse(success=True, improvedDescription="...")      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Workflow

### Step 1: User Interaction (Frontend)
Location: `src/components/history/EditPostModal.tsx`

```typescript
// User clicks "Improve with AI" button
const handleImproveWithAI = (platform: Platform) => {
  const currentContent = editStates[platform]?.content;
  if (!currentContent || currentContent.trim().length === 0) {
    setImprovementError('Please enter some content first');
    return;
  }
  setShowImprovementModal(true);  // Shows modal
};

// User submits improvement request
const handleSubmitImprovement = async () => {
  const response = await fetch('/py-api/content/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: currentContent,
      platform: activePlatform,
      postType: post.postType,
      additionalInstructions: improvementInstructions || undefined,
      modelId: selectedModelId,
    }),
  });
  
  const data = await response.json();
  // Updates the content textarea with improved version
  setEditStates(prev => ({
    ...prev,
    [activePlatform]: { ...prev[activePlatform], content: data.improvedDescription },
  }));
};
```

### Step 2: Next.js Rewrite (Proxy)
Location: `next.config.mjs`

```javascript
async rewrites() {
  return [
    {
      source: '/py-api/:path*',
      destination: `${pythonBackendUrl}/api/v1/:path*`,
    },
    // ... other rewrites
  ];
}
```

### Step 3: FastAPI Route Handler
Location: `python_backend/src/api/v1/content_improvement.py`

```python
router = APIRouter(prefix="/api/v1/content", tags=["Content Improvement"])

@router.post("/improve", response_model=ImproveContentResponse)
async def improve_content(request: ImproveContentRequest) -> ImproveContentResponse:
    result = await improve_content_description(request)
    return result
```

### Step 4: Main Service Function
Location: `python_backend/src/agents/content_improvement_agent/service.py`

```python
async def improve_content_description(request: ImproveContentRequest) -> ImproveContentResponse:
    # 1. Build system prompt (emphasizes preserving user's message)
    system_prompt = build_improvement_system_prompt(
        request.platform,
        request.postType
    )
    
    # 2. Create LLM
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.7,
    )
    
    # 3. Create agent with SkillMiddleware
    agent = create_agent(
        model=model,
        tools=[],
        system_prompt=system_prompt,
        middleware=[SkillMiddleware()],  # Adds load_skill tool
    )
    
    # 4. Invoke agent
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": user_prompt}]
    })
    
    # 5. Extract text from response (handles content blocks)
    # ... content extraction logic ...
    
    return ImproveContentResponse(
        success=True,
        improvedDescription=improved_description,
        metadata={"platform": request.platform, "postType": request.postType}
    )
```

### Step 5: SkillMiddleware
Location: `python_backend/src/agents/content_improvement_agent/middleware.py`

```python
class SkillMiddleware(AgentMiddleware):
    # Registers load_skill tool with the agent
    tools = [load_skill]
    
    async def awrap_model_call(self, request, handler):
        # Injects available platform skills into system prompt
        skills_addendum = self._build_skills_addendum()
        # ... append to system message ...
        return await handler(modified_request)
```

### Step 6: load_skill Tool
Location: `python_backend/src/agents/content_improvement_agent/tools.py`

```python
@tool
def load_skill(skill_name: str) -> str:
    """Load a platform skill to get expert content optimization knowledge."""
    skill = get_skill(skill_name)
    if not skill:
        return f"Skill '{skill_name}' not found. Available: {get_available_skills()}"
    return skill["content"]  # Returns the full platform expert guide
```

---

## File Reference

### Backend Files

| File | Description | When to Edit |
|------|-------------|--------------|
| `service.py` | Main `improve_content_description()` function | Change LLM model, temperature, response extraction |
| `prompts.py` | System prompt with preserve-user-message emphasis | Adjust improvement guidelines, change skill routing |
| `middleware.py` | `SkillMiddleware` class | Change how skills are injected into prompts |
| `tools.py` | `load_skill` tool definition | Modify tool behavior or add new tools |
| `schemas.py` | Pydantic request/response models | Add new fields to API |
| `__init__.py` | Module exports | Add new exports |

### Skills Files

| File | Platform | 2025 Focus |
|------|----------|------------|
| `skills/instagram.py` | Instagram | Hooks in first 125 chars, 9 hashtags optimal |
| `skills/facebook.py` | Facebook | Reels priority, Groups engagement |
| `skills/twitter.py` | Twitter/X | Threads get 63% more impressions, 2-3 hashtags |
| `skills/linkedin.py` | LinkedIn | Thought leadership, 3-5x weekly, heavy line breaks |
| `skills/tiktok.py` | TikTok | Hook in 1-3 seconds, under 150 char captions |
| `skills/youtube.py` | YouTube | SEO descriptions 250+ words, Shorts under 40 chars |
| `skills/__init__.py` | Registry | Add new skills to SKILLS list |
| `skills/types.py` | Type definition | Extend Skill TypedDict if needed |

### Frontend Files

| File | Description |
|------|-------------|
| `src/components/history/EditPostModal.tsx` | Edit modal with "Improve with AI" button |
| `next.config.mjs` | `/py-api/*` → Python backend rewrite |

---

## Skills System

### What is a Skill?
A skill is a structured knowledge package containing 2025 best practices for a specific social media platform.

### Skill Structure
```python
INSTAGRAM_SKILL: Skill = {
    "name": "instagram",
    "description": "Expert for Instagram content: captions, hashtags, hooks...",
    "content": """# Instagram Content Expert - 2025

## PLATFORM OVERVIEW
- Character Limit: 2,200 (first 125 visible before "more")
- Hashtags: 9 hashtags = 28% more engagement
- Content Priority: Reels > Carousels > Images

## HOOK FORMULAS (First 125 Characters)
- "Did you know...?"
- "Stop scrolling if you..."
- "What would you do if...?"

## EXAMPLE TRANSFORMATION
Before: "Check out our new product!"
After: "This changed my morning routine forever ☀️ ..."
"""
}
```

### How Skills Are Used
1. **System prompt** tells agent: "You MUST call `load_skill('instagram')`"
2. **Agent calls** `load_skill("instagram")` tool
3. **Tool returns** the full skill content (2025 best practices)
4. **Agent reads** the hooks, formatting, hashtag strategy
5. **Agent applies** the techniques while preserving user's original message
6. **Agent outputs** the improved content

---

## API Reference

### Endpoint
```
POST /api/v1/content/improve
```

### Frontend Path (via proxy)
```
POST /py-api/content/improve
```

### Request Body
```typescript
interface ImproveContentRequest {
  description: string;        // Required: The user's content to improve
  platform: Platform;         // Required: "instagram" | "facebook" | "twitter" | "linkedin" | "tiktok" | "youtube"
  postType?: PostType;        // Optional: "post" | "reel" | "story" | "carousel" | "video" | "short"
  additionalInstructions?: string;  // Optional: User guidance like "make it shorter"
  modelId?: string;           // Optional: LLM model to use
}
```

### Response Body
```typescript
interface ImproveContentResponse {
  success: boolean;
  improvedDescription: string;
  metadata: {
    platform: string;
    postType: string | null;
  }
}
```

### Platform Character Limits
| Platform | Caption Limit | Title Limit |
|----------|---------------|-------------|
| Instagram | 2,200 | - |
| Facebook | 63,206 | - |
| Twitter | 280 | - |
| LinkedIn | 3,000 | - |
| TikTok | 2,200 | - |
| YouTube | 5,000 | 100 |

---

## Common Tasks

### Adding a New Platform Skill

**Step 1: Create the skill file**
```python
# skills/new_platform.py
from .types import Skill

NEW_PLATFORM_SKILL: Skill = {
    "name": "new_platform",
    "description": "Expert for New Platform: engagement, hooks, best practices",
    "content": """# New Platform Expert - 2025

## PLATFORM OVERVIEW
- Character Limit: ...
- Hashtags: ...
- Tone: ...

## HOOK FORMULAS
- ...

## EXAMPLE TRANSFORMATION
Before: "..."
After: "..."
"""
}
```

**Step 2: Register the skill**
```python
# skills/__init__.py
from .new_platform import NEW_PLATFORM_SKILL

SKILLS: list[Skill] = [
    INSTAGRAM_SKILL,
    # ... other skills ...
    NEW_PLATFORM_SKILL,  # Add here
]
```

**Step 3: Update backend schema**
```python
# schemas.py
Platform = Literal["instagram", "facebook", ..., "new_platform"]
```

### Changing the LLM Model
```python
# service.py
model = ChatGoogleGenerativeAI(
    model="gemini-2.5-pro",  # Change this
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0.7,  # Adjust creativity (0=focused, 1=creative)
)
```

### Customizing Improvement Behavior
Edit `prompts.py` to change what the agent focuses on:
```python
## WHAT TO IMPROVE
✅ Add an engaging hook at the start
✅ Improve formatting (line breaks, emojis)
✅ Add relevant hashtags
✅ Include a call-to-action

## WHAT TO PRESERVE
🔒 User's main message and intent
🔒 Their tone and voice
🔒 Specific names, brands, terms
```

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `404 NOT_FOUND models/gemini-...` | Invalid model name | Check [Google AI docs](https://ai.google.dev/gemini-api/docs/models) for valid names |
| `Unsupported platform: xyz` | Invalid platform | Use: instagram, facebook, twitter, linkedin, tiktok, youtube |
| Response contains `[{'type': 'text'...}]` | Wrong content extraction | Content is list of blocks, need to extract `.text` field (already fixed in service.py) |
| `awrap_model_call is not available` | Missing async method | Ensure middleware has `awrap_model_call` method |

### Debug Steps
1. Check uvicorn logs for Python errors
2. Test API directly with curl (bypass frontend)
3. Print intermediate values in `service.py`
4. Verify skill is loaded correctly with `get_skill("platform_name")`

### Testing Skills
```python
# Quick test in Python
from src.agents.content_improvement_agent.skills import get_skill, get_available_skills

# List all skills
print(get_available_skills())  # ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube']

# Get a specific skill
skill = get_skill("instagram")
print(skill["content"][:500])
```
