"""
Media Prompt Skills

This module contains skill definitions for the media prompt improvement agent.
Each skill is defined as a TypedDict with name, description, and content.

Skills are loaded on-demand using the load_skill tool.
"""

from .google_imagen import GOOGLE_IMAGEN_SKILL
from .google_veo import GOOGLE_VEO_SKILL
from .openai_gpt_image import OPENAI_GPT_IMAGE_SKILL
from .openai_sora import OPENAI_SORA_SKILL
from .runway_gen3 import RUNWAY_GEN3_SKILL
from .types import Skill

# All available skills
SKILLS: list[Skill] = [
    GOOGLE_IMAGEN_SKILL,
    GOOGLE_VEO_SKILL,
    OPENAI_GPT_IMAGE_SKILL,
    OPENAI_SORA_SKILL,
    RUNWAY_GEN3_SKILL,
]

# Lookup by name
SKILLS_BY_NAME: dict[str, Skill] = {s["name"]: s for s in SKILLS}


def get_skill(name: str) -> Skill | None:
    """Get a skill by name."""
    return SKILLS_BY_NAME.get(name)


def get_available_skills() -> list[str]:
    """Get list of available skill names."""
    return list(SKILLS_BY_NAME.keys())


__all__ = [
    "Skill",
    "SKILLS",
    "SKILLS_BY_NAME",
    "get_skill",
    "get_available_skills",
    "GOOGLE_IMAGEN_SKILL",
    "GOOGLE_VEO_SKILL",
    "OPENAI_GPT_IMAGE_SKILL",
    "OPENAI_SORA_SKILL",
    "RUNWAY_GEN3_SKILL",
]
