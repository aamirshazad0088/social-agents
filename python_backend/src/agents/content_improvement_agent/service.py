"""
Content Improvement Service
AI-powered social media content description improvement
"""
import logging
import time
import re
from langchain.agents import create_agent

from .schemas import ImproveContentRequest, ImproveContentResponse, PLATFORM_GUIDELINES
from .prompts import build_improvement_system_prompt
from ...services import create_dynamic_model

logger = logging.getLogger(__name__)


async def improve_content_description(
    request: ImproveContentRequest
) -> ImproveContentResponse:
    """
    Improve social media content description using AI
    
    Args:
        request: Improvement request
        
    Returns:
        Improved content response
    """
    start_time = time.time()
    
    try:
        # Validate platform
        if request.platform not in PLATFORM_GUIDELINES:
            raise ValueError(f"Unsupported platform: {request.platform}")
        
        guidelines = PLATFORM_GUIDELINES[request.platform]
        
        # Build system prompt
        system_prompt = build_improvement_system_prompt(
            request.platform,
            request.postType
        )
        
        # Build user prompt
        user_prompt = f"""Original Description:
\"\"\"{request.description}\"\"\"
"""
        
        if request.additionalInstructions:
            user_prompt += f"\nAdditional Instructions: {request.additionalInstructions}\n"
        
        user_prompt += "\nProvide the improved description:"
        
        # Create model
        model_id = request.modelId or "google-genai:gemini-3-flash-preview"
        model = await create_dynamic_model(model_id)
        
        # Create agent (simple, no tools)
        agent = create_agent(
            model=model,
            tools=[],
            system_prompt=system_prompt
        )
        
        # Invoke agent
        result = await agent.invoke({
            "messages": [{"role": "user", "content": user_prompt}]
        })
        
        # Extract improved description
        messages = result.get("messages", [])
        last_message = messages[-1] if messages else None
        
        if not last_message:
            raise ValueError("No response from agent")
        
        improved_description = (
            last_message.get("content", "")
            if isinstance(last_message, dict)
            else str(last_message.content) if hasattr(last_message, "content") else ""
        )
        
        improved_description = improved_description.strip()
        
        if not improved_description:
            raise ValueError("Agent returned empty response")
        
        # Truncate if needed
        if len(improved_description) > guidelines["characterLimit"]:
            improved_description = intelligent_truncate(
                improved_description,
                guidelines["characterLimit"]
            )
        
        # Calculate generation time
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"Content improved for {request.platform} in {generation_time_ms}ms")
        
        return ImproveContentResponse(
            success=True,
            originalDescription=request.description,
            improvedDescription=improved_description,
            metadata={
                "platform": request.platform,
                "postType": request.postType,
                "characterCount": len(improved_description),
                "timestamp": int(time.time() * 1000),
                "processingTime": generation_time_ms
            }
        )
        
    except Exception as e:
        logger.error(f"Content improvement error: {e}", exc_info=True)
        raise


def intelligent_truncate(text: str, max_length: int) -> str:
    """
    Intelligently truncate text to fit character limit
    Preserves complete sentences and hashtags
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    # Extract hashtags if present
    hashtag_match = re.search(r'(#\w+(\s+#\w+)*)\s*$', text)
    hashtags = hashtag_match.group(0) if hashtag_match else ''
    content_without_hashtags = text.replace(hashtags, '').strip() if hashtags else text
    
    # Calculate available space
    available_space = max_length - (len(hashtags) + 2 if hashtags else 0)
    
    if available_space <= 0:
        return text[:max_length - 3] + '...'
    
    # Try to truncate at sentence boundary
    sentences = re.findall(r'[^.!?]+[.!?]+', content_without_hashtags)
    if not sentences:
        sentences = [content_without_hashtags]
    
    truncated = ''
    for sentence in sentences:
        if len(truncated + sentence) <= available_space:
            truncated += sentence
        else:
            break
    
    # If no complete sentences fit, truncate at word boundary
    if not truncated:
        words = content_without_hashtags.split()
        for word in words:
            if len(truncated + ' ' + word) <= available_space - 3:
                truncated += (' ' if truncated else '') + word
            else:
                break
        truncated += '...'
    
    # Re-add hashtags
    return f"{truncated}\n\n{hashtags}" if hashtags else truncated
