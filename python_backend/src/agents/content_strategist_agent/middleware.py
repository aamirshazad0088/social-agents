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
from .tools.skill_tools import load_skill


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
            # Format: skill name with description
            skills_list.append(
                f"- **{skill['name']}**: {skill['description']}"
            )
        self.skills_prompt = "\n".join(skills_list)
        
        # Count skills for summary
        self.skills_count = len(SKILLS)
    
    def _build_skills_addendum(self) -> str:
        """Build the skills section to append to system prompt."""
        return f"""

## Available Platform Skills ({self.skills_count} total)

{self.skills_prompt}

### How to Use Skills

1. **Identify the target platform** from the user's request (e.g., "Instagram", "LinkedIn")
2. **Call `load_skill(platform_name)`** to get the full expert content guide
3. **Apply the loaded expertise** - use the hooks, structures, and examples from the skill
4. **Return optimized content** following the platform's best practices

### Skill Contents Include
- Hook formulas and attention-grabbing openers
- Post/caption structure templates
- Hashtag and engagement strategies
- Platform-specific formatting
- Before/after example transformations
- Call-to-action templates

**IMPORTANT**: Always load the appropriate skill BEFORE writing platform-specific content. The skill contains essential expertise for creating high-quality content.
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
