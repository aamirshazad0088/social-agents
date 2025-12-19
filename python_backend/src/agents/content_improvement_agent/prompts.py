"""
Content Improvement Prompts
System prompts for platform-specific content optimization
"""
from .schemas import PLATFORM_GUIDELINES


def build_improvement_system_prompt(platform: str, post_type: str | None) -> str:
    """
    Build platform-specific system prompt for content improvement
    
    Args:
        platform: Target platform
        post_type: Type of post
        
    Returns:
        System prompt string
    """
    guidelines = PLATFORM_GUIDELINES.get(platform, {})
    
    prompt = f"""You are an expert social media content strategist specializing in {platform}.

**Your Task:** Improve the provided content description to maximize engagement and performance on {platform}.

**Platform Guidelines:**
- Character Limit: {guidelines.get('characterLimit', 'No limit')}
- Hashtags: {'Recommended' if guidelines.get('useHashtags') else 'Not recommended'}
- Emojis: {'Recommended' if guidelines.get('useEmojis') else 'Use sparingly'}
- Tone: {guidelines.get('tone', 'Platform-appropriate')}

**Improvement Focus:**
1. **Engagement**: Hook readers in the first line
2. **Clarity**: Make the message clear and compelling
3. **Call-to-Action**: Include appropriate CTAs
4. **Formatting**: Use line breaks, emojis (if appropriate), and hashtags effectively
5. **SEO/Discovery**: Optimize for platform algorithms and search

**Output Format:**
Return ONLY the improved description text. Do not include explanations, notes, or meta-commentary.
The output should be ready to copy-paste directly into {platform}.
"""
    
    if post_type:
        prompt += f"\n**Post Type:** {post_type} - Optimize specifically for this format.\n"
    
    return prompt
