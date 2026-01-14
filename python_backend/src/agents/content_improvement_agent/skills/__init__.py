"""
Skills Registry
Central registry for all social media platform skills.
"""
from typing import Optional

from .types import Skill
from .instagram import INSTAGRAM_SKILL
from .facebook import FACEBOOK_SKILL
from .twitter import TWITTER_SKILL
from .linkedin import LINKEDIN_SKILL
from .tiktok import TIKTOK_SKILL
from .youtube import YOUTUBE_SKILL


# All available skills
SKILLS: list[Skill] = [
    INSTAGRAM_SKILL,
    FACEBOOK_SKILL,
    TWITTER_SKILL,
    LINKEDIN_SKILL,
    TIKTOK_SKILL,
    YOUTUBE_SKILL,
]


def get_skill(name: str) -> Optional[Skill]:
    """Get a skill by name."""
    for skill in SKILLS:
        if skill["name"].lower() == name.lower():
            return skill
    return None


def get_available_skills() -> list[str]:
    """Get list of available skill names."""
    return [skill["name"] for skill in SKILLS]


__all__ = [
    "Skill",
    "SKILLS",
    "get_skill",
    "get_available_skills",
    "INSTAGRAM_SKILL",
    "FACEBOOK_SKILL",
    "TWITTER_SKILL",
    "LINKEDIN_SKILL",
    "TIKTOK_SKILL",
    "YOUTUBE_SKILL",
]
