"""
Skill TypedDict definition for LangChain skills pattern.
"""

from typing import TypedDict


class Skill(TypedDict):
    """
    A skill that can be progressively disclosed to the agent.
    
    Follows LangChain skills pattern where:
    - name: Unique identifier for the skill
    - description: Short description shown in system prompt
    - content: Full expert knowledge loaded on-demand
    """
    name: str           # e.g., "google_imagen"
    description: str    # 1-2 sentence description
    content: str        # Full expert prompt with detailed instructions
