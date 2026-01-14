"""
Skill Loading Tool

Tool for agents to load skill content on-demand (progressive disclosure).
Follows LangChain Skills Pattern:
https://docs.langchain.com/oss/python/langchain/multi-agent/skills
"""

from langchain_core.tools import tool

from ..skills import SKILLS, get_skill, get_available_skills


@tool
def load_skill(skill_name: str) -> str:
    """Load detailed expertise for content creation or media generation.
    
    Use this when you need comprehensive guidelines for:
    1. Writing platform-specific social media content
    2. Creating optimized prompts for AI image/video generation
    
    PLATFORM SKILLS (Social Media Content):
    - instagram: Captions, hashtags, Reels, Stories, Carousels
    - linkedin: Professional posts, thought leadership, B2B content
    - twitter: Viral tweets, threads, engagement tactics
    - tiktok: Video scripts, hooks, trending formats
    - youtube: Titles, descriptions, scripts, community posts
    - facebook: Posts, groups, events, community engagement
    
    MEDIA GENERATION SKILLS:
    - google_imagen: Google Imagen 4 for image generation
    - google_veo: Google Veo 3 for video generation
    
    Args:
        skill_name: The skill to load (e.g., "instagram", "google_veo")
    
    Returns:
        The full skill content with detailed instructions and examples
    """
    skill = get_skill(skill_name.lower())
    
    if skill:
        return f"✅ Loaded skill: {skill_name}\n\n{skill['content']}"
    
    # Skill not found - return available options
    available = ", ".join(get_available_skills())
    return f"❌ Skill '{skill_name}' not found. Available skills: {available}"


