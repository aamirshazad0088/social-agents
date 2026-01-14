"""
Content Strategist Skills

This module contains skill definitions for the content strategist agent.
Each skill is defined as a TypedDict with name, description, and content.

Skills are loaded on-demand using the load_skill tool.

Platform Skills (Social Media Content):
- Instagram, LinkedIn, Twitter, TikTok, YouTube, Facebook

Media Generation Skills:
- Google Imagen (image generation)
- Google Veo (video generation)
"""

from .instagram import INSTAGRAM_SKILL
from .linkedin import LINKEDIN_SKILL
from .twitter import TWITTER_SKILL
from .tiktok import TIKTOK_SKILL
from .youtube import YOUTUBE_SKILL
from .facebook import FACEBOOK_SKILL
from .google_imagen import GOOGLE_IMAGEN_SKILL
from .google_veo import GOOGLE_VEO_SKILL
from .types import Skill

# All available skills
SKILLS: list[Skill] = [
    # Platform skills (social media content)
    INSTAGRAM_SKILL,
    LINKEDIN_SKILL,
    TWITTER_SKILL,
    TIKTOK_SKILL,
    YOUTUBE_SKILL,
    FACEBOOK_SKILL,
    # Media generation skills
    GOOGLE_IMAGEN_SKILL,
    GOOGLE_VEO_SKILL,
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
    # Platform skills
    "INSTAGRAM_SKILL",
    "LINKEDIN_SKILL",
    "TWITTER_SKILL",
    "TIKTOK_SKILL",
    "YOUTUBE_SKILL",
    "FACEBOOK_SKILL",
    # Media generation skills
    "GOOGLE_IMAGEN_SKILL",
    "GOOGLE_VEO_SKILL",
]


