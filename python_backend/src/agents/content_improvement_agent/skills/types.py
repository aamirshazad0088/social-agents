"""
Skill Type Definition
TypedDict for social media platform skills.
"""
from typing import TypedDict


class Skill(TypedDict):
    """Skill definition for platform-specific content optimization."""
    name: str          # Unique identifier (e.g., "instagram")
    description: str   # Brief skill summary
    content: str       # Full expert knowledge content
