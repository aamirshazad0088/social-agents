"""
Media Prompt Improvement Service  
AI-powered prompt enhancement for image/video generation
"""
import logging
import time
from langchain.agents import create_agent

from .schemas import ImprovePromptRequest, ImprovePromptResponse, MEDIA_TYPE_GUIDELINES
from .prompts import build_prompt_improvement_system_prompt
from ...services import create_dynamic_model

logger = logging.getLogger(__name__)


async def improve_media_prompt(
    request: ImprovePromptRequest
) -> ImprovePromptResponse:
    """
    Improve AI generation prompt for images/videos
    
    Args:
        request: Prompt improvement request
        
    Returns:
        Improved prompt response
    """
    start_time = time.time()
    
    try:
        # Validate media type
        if request.mediaType not in MEDIA_TYPE_GUIDELINES:
            raise ValueError(f"Unsupported media type: {request.mediaType}")
        
        # Build system prompt
        system_prompt = build_prompt_improvement_system_prompt(
            request.mediaType,
            request.provider
        )
        
        # Build user prompt
        user_prompt = f"""Original Prompt:
\"\"\"{request.originalPrompt}\"\"\"
"""
        
        if request.mediaSubType:
            user_prompt += f"\nMedia Subtype: {request.mediaSubType}\n"
        
        if request.model:
            user_prompt += f"\nTarget Model: {request.model}\n"
        
        if request.userInstructions:
            user_prompt += f"\nUser Instructions: {request.userInstructions}\n"
        
        user_prompt += "\nProvide the improved prompt:"
        
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
        
        # Extract improved prompt
        messages = result.get("messages", [])
        last_message = messages[-1] if messages else None
        
        if not last_message:
            raise ValueError("No response from agent")
        
        improved_prompt = (
            last_message.get("content", "")
            if isinstance(last_message, dict)
            else str(last_message.content) if hasattr(last_message, "content") else ""
        )
        
        improved_prompt = improved_prompt.strip()
        
        if not improved_prompt:
            raise ValueError("Agent returned empty response")
        
        # Calculate generation time
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"Prompt improved for {request.mediaType} in {generation_time_ms}ms")
        
        # Extract improvements (simple analysis)
        improvements = analyze_improvements(request.originalPrompt, improved_prompt)
        
        return ImprovePromptResponse(
            success=True,
            improvedPrompt=improved_prompt,
            originalPrompt=request.originalPrompt,
            mediaType=request.mediaType,
            improvements=improvements,
            suggestions=None,  # Could add AI-generated suggestions
            technicalDetails={
                "provider": request.provider,
                "model": request.model,
                "subType": request.mediaSubType
            },
            processingTime=generation_time_ms
        )
        
    except Exception as e:
        logger.error(f"Prompt improvement error: {e}", exc_info=True)
        raise


def analyze_improvements(original: str, improved: str) -> list[str]:
    """
    Analyze what improvements were made
    
    Args:
        original: Original prompt
        improved: Improved prompt
        
    Returns:
        List of improvement descriptions
    """
    improvements = []
    
    # Length increase
    if len(improved) > len(original) * 1.5:
        improvements.append("Added significant detail and specificity")
    
    # Technical keywords
    technical_keywords = ["lighting", "composition", "camera", "style", "quality", "detailed", "professional"]
    added_keywords = [kw for kw in technical_keywords if kw.lower() in improved.lower() and kw.lower() not in original.lower()]
    if added_keywords:
        improvements.append(f"Added technical details: {', '.join(added_keywords)}")
    
    # Aspect ratio
    if "--ar" in improved and "--ar" not in original:
        improvements.append("Added aspect ratio specification")
    
    # Style references
    if any(word in improved.lower() for word in ["style", "artistic", "cinematic", "photorealistic"]):
        if not any(word in original.lower() for word in ["style", "artistic", "cinematic", "photorealistic"]):
            improvements.append("Added style and aesthetic direction")
    
    # Composition details
    if any(word in improved.lower() for word in ["angle", "perspective", "framing", "composition"]):
        if not any(word in original.lower() for word in ["angle", "perspective", "framing", "composition"]):
            improvements.append("Enhanced composition and framing details")
    
    if not improvements:
        improvements.append("Enhanced overall prompt quality and clarity")
    
    return improvements
