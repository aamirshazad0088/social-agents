"""
Skill Middleware
Middleware that injects available skill descriptions into the system prompt
and registers the load_skill tool with the agent.
"""
from typing import Callable

from langchain.agents.middleware import AgentMiddleware, ModelRequest, ModelResponse
from langchain.messages import SystemMessage

from .skills import SKILLS
from .tools import load_skill


class SkillMiddleware(AgentMiddleware):
    """
    Middleware that injects platform skill descriptions into the system prompt.
    
    Follows LangChain skills pattern:
    1. Registers load_skill tool
    2. Injects available skills into system prompt
    3. Agent decides when to load detailed skill content
    """
    
    # Register the load_skill tool
    tools = [load_skill]
    
    def __init__(self):
        """Initialize and generate the skills prompt from SKILLS list."""
        skills_list = []
        for skill in SKILLS:
            skills_list.append(
                f"- **{skill['name']}**: {skill['description']}"
            )
        self.skills_prompt = "\n".join(skills_list)
        self.skills_count = len(SKILLS)
    
    def _build_skills_addendum(self) -> str:
        """Build the skills section to append to system prompt."""
        return f"""

## Available Platform Skills ({self.skills_count} total)

{self.skills_prompt}

### How to Use Skills

1. **Identify the target platform** from the user's request
2. **Call `load_skill(platform_name)`** to get the full expert content guide
3. **Apply the loaded expertise** - use the hooks, formatting, hashtag strategy, and examples
4. **Return the optimized content** following the platform's 2025 best practices

### Skill Contents Include
- Platform-specific character limits and rules
- Hook formulas and examples
- Hashtag strategy
- Post structure templates
- Call-to-action examples
- Before/after transformations

**CRITICAL**: Always load the appropriate platform skill BEFORE writing the improved content.
"""
    
    def wrap_model_call(
        self,
        request: ModelRequest,
        handler: Callable[[ModelRequest], ModelResponse],
    ) -> ModelResponse:
        """Sync: Inject skill descriptions into system prompt."""
        skills_addendum = self._build_skills_addendum()
        
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
        
        new_content = list(request.system_message.content_blocks) + [
            {"type": "text", "text": skills_addendum}
        ]
        
        new_system_message = SystemMessage(content=new_content)
        modified_request = request.override(system_message=new_system_message)
        
        return await handler(modified_request)
