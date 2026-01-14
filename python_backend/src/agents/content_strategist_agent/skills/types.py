"""
Content Strategist Skills Type Definition
"""
from typing import TypedDict


class Skill(TypedDict):
    """Skill definition for content strategist agent."""
    name: str
    description: str
    content: str
