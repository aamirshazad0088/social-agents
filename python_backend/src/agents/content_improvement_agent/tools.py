"""
Load Skill Tool
Tool for dynamically loading platform-specific content optimization expertise.
"""
from langchain_core.tools import tool

from .skills import get_skill, get_available_skills


@tool
def load_skill(skill_name: str) -> str:
    """
    Load a social media platform skill to get expert content optimization knowledge.
    
    Args:
        skill_name: Name of the platform skill to load (e.g., "instagram", "linkedin", "twitter")
        
    Returns:
        The skill's expert content with platform-specific guidelines, hooks, and examples.
    """
    skill = get_skill(skill_name)
    
    if not skill:
        available = get_available_skills()
        return f"Skill '{skill_name}' not found. Available skills: {', '.join(available)}"
    
    return skill["content"]
