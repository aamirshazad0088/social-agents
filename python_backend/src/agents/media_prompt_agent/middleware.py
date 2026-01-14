"""
Skill Middleware

Middleware that injects available skill descriptions into the system prompt
and registers the load_skill tool with the agent.

Follows LangChain Skills Pattern:
https://docs.langchain.com/oss/python/langchain/multi-agent/skills
"""

from typing import Callable

from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langchain.messages import SystemMessage

from .skills import SKILLS
from .tools import load_skill


class SkillMiddleware(AgentMiddleware):
    """
    Middleware that injects skill descriptions into the system prompt.
    
    Follows LangChain skills pattern:
    1. Registers load_skill tool
    2. Injects available skills into system prompt
    3. Agent decides when to load detailed skill content
    """
    
    # Register the load_skill tool as a class variable
    tools = [load_skill]
    
    def __init__(self):
        """Initialize and generate the skills prompt from SKILLS list."""
        skills_list = []
        for skill in SKILLS:
            # Format: skill name with description and what it provides
            skills_list.append(
                f"- **{skill['name']}**: {skill['description']}"
            )
        self.skills_prompt = "\n".join(skills_list)
        
        # Count skills for summary
        self.skills_count = len(SKILLS)
    
    def _build_skills_addendum(self) -> str:
        """Build the skills section to append to system prompt."""
        return f"""

## Available Skills ({self.skills_count} total)

{self.skills_prompt}

### How to Use Skills

1. **Identify the target provider** from the user's request (e.g., "google", "openai", "runway")
2. **Call `load_skill(skill_name)`** to get the full expert prompt guide
3. **Apply the loaded expertise** - use the structure, keywords, modifiers, and examples from the skill
4. **Return the optimized prompt** following the provider's best practices

### Skill Contents Include
- Prompt structure templates specific to each provider
- Camera, lighting, style vocabulary
- Aspect ratio recommendations
- Quality modifiers and keywords
- Before/after example transformations

**CRITICAL**: Always load the appropriate skill BEFORE writing the improved prompt. The skill contains essential provider-specific knowledge.
"""
    
    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        """Sync: Inject skill descriptions into system prompt."""
        skills_addendum = self._build_skills_addendum()
        
        # Append to system message content blocks
        new_content = list(request.system_message.content_blocks) + [
            {"type": "text", "text": skills_addendum}
        ]
        
        new_system_message = SystemMessage(content=new_content)
        modified_request = request.override(system_message=new_system_message)
        
        return handler(modified_request)
    
    async def awrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        """Async: Inject skill descriptions into system prompt."""
        skills_addendum = self._build_skills_addendum()
        
        # Append to system message content blocks
        new_content = list(request.system_message.content_blocks) + [
            {"type": "text", "text": skills_addendum}
        ]
        
        new_system_message = SystemMessage(content=new_content)
        modified_request = request.override(system_message=new_system_message)
        
        return await handler(modified_request)

