"""Media Prompt Improvement Agent - Main Export

Expert agentic prompt improvement system using LangChain Skills Pattern.
Uses progressive disclosure where specialized expertise is loaded on-demand.
"""
from .service import improve_media_prompt
from .schemas import (
    ImprovePromptRequest,
    ImprovePromptResponse,
    MediaType,
    MediaProvider,
    MEDIA_TYPE_GUIDELINES
)
from .prompts import build_prompt_improvement_system_prompt
from .skills import (
    Skill,
    SKILLS,
    get_skill,
    get_available_skills,
    GOOGLE_IMAGEN_SKILL,
    GOOGLE_VEO_SKILL,
    OPENAI_GPT_IMAGE_SKILL,
    RUNWAY_GEN3_SKILL,
)
from .tools import load_skill
from .middleware import SkillMiddleware

__all__ = [
    # Main service
    "improve_media_prompt",
    # Schemas
    "ImprovePromptRequest",
    "ImprovePromptResponse",
    "MediaType",
    "MediaProvider",
    "MEDIA_TYPE_GUIDELINES",
    # Legacy prompts
    "build_prompt_improvement_system_prompt",
    # Skills
    "Skill",
    "SKILLS",
    "get_skill",
    "get_available_skills",
    "GOOGLE_IMAGEN_SKILL",
    "GOOGLE_VEO_SKILL",
    "OPENAI_GPT_IMAGE_SKILL",
    "RUNWAY_GEN3_SKILL",
    # Tools and Middleware
    "load_skill",
    "SkillMiddleware",
]
