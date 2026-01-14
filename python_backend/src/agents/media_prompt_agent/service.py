"""
Media Prompt Improvement Service  
AI-powered prompt enhancement using LangChain Skills Pattern.

Uses progressive disclosure where the agent loads specialized expertise
on-demand via the load_skill tool.
"""
import logging

from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from .schemas import ImprovePromptRequest, ImprovePromptResponse, MEDIA_TYPE_GUIDELINES
from .middleware import SkillMiddleware
from .prompts import build_prompt_improvement_system_prompt
from ...config import settings

logger = logging.getLogger(__name__)


async def improve_media_prompt(
    request: ImprovePromptRequest
) -> ImprovePromptResponse:
    """
    Improve AI generation prompt using LangChain Skills Pattern.
    
    The agent uses progressive disclosure to load specialized expertise
    for the target provider on-demand.
    
    Args:
        request: Prompt improvement request with provider, mediaType, etc.
        
    Returns:
        Improved prompt response
    """
    try:
        # Validate media type
        if request.mediaType not in MEDIA_TYPE_GUIDELINES:
            raise ValueError(f"Unsupported media type: {request.mediaType}")
        
        # Build system prompt using prompts.py function
        # This includes skills-aware instructions
        system_prompt = build_prompt_improvement_system_prompt(
            media_type=request.mediaType,
            provider=request.provider
        )
        
        # Create LLM
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
        
        # Create agent with SkillMiddleware
        # The middleware:
        # 1. Injects available skills into system prompt
        # 2. Registers load_skill tool
        agent = create_agent(
            model=model,
            tools=[],
            system_prompt=system_prompt,
            middleware=[SkillMiddleware()],
        )
        
        # Build user message
        user_message = _build_user_message(request)
        
        # Invoke agent
        result = await agent.ainvoke({
            "messages": [{"role": "user", "content": user_message}]
        })
        
        # Extract improved prompt
        messages = result.get("messages", [])
        last_message = messages[-1] if messages else None
        
        if not last_message:
            raise ValueError("No response from agent")
        
        # Get content - may be string, list of blocks, or object with content attr
        raw_content = (
            last_message.get("content", "")
            if isinstance(last_message, dict)
            else last_message.content if hasattr(last_message, "content") else ""
        )
        
        # Extract text from content blocks if it's a list
        if isinstance(raw_content, list):
            # Content is a list of blocks like [{'type': 'text', 'text': '...'}]
            text_parts = []
            for block in raw_content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_parts.append(block)
            improved_prompt = "\n".join(text_parts)
        else:
            improved_prompt = str(raw_content)
        
        improved_prompt = improved_prompt.strip()
        
        if not improved_prompt:
            raise ValueError("Agent returned empty response")
        
        logger.info(
            f"Prompt improved for {request.provider}/{request.mediaType} using skills pattern"
        )
        
        return ImprovePromptResponse(
            success=True,
            improvedPrompt=improved_prompt,
        )
        
    except Exception as e:
        logger.error(f"Prompt improvement error: {e}", exc_info=True)
        raise


def _build_user_message(request: ImprovePromptRequest) -> str:
    """Build the user message for the agent."""
    
    # Map provider to skill name
    provider_skill_map = {
        "google": "google_imagen" if "image" in request.mediaType else "google_veo",
        "imagen": "google_imagen",
        "veo": "google_veo",
        "openai": "openai_gpt_image",
        "runway": "runway_gen3",
    }
    
    provider_lower = (request.provider or "").lower()
    suggested_skill = provider_skill_map.get(provider_lower, "google_imagen")
    
    message = f"""Improve this prompt for {request.provider} ({request.mediaType}):

Original Prompt: "{request.originalPrompt}"

Target Provider Skill: {suggested_skill}
"""
    
    if request.mediaSubType:
        message += f"Media Subtype: {request.mediaSubType}\n"
    
    if request.model:
        message += f"Target Model: {request.model}\n"
    
    if request.userInstructions:
        message += f"User Instructions: {request.userInstructions}\n"
    
    message += "\nLoad the appropriate skill and provide the optimized prompt."
    
    return message
