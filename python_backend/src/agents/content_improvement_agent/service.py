"""
Content Improvement Service
AI-powered social media content description improvement using LangChain Skills Pattern.
"""
import logging
from langchain.agents import create_agent

from .schemas import ImproveContentRequest, ImproveContentResponse, PLATFORM_GUIDELINES
from .prompts import build_improvement_system_prompt
from .middleware import SkillMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from ...config import settings

logger = logging.getLogger(__name__)


async def improve_content_description(
    request: ImproveContentRequest
) -> ImproveContentResponse:
    """
    Improve social media content description using LangChain Skills Pattern.
    
    The agent uses progressive disclosure to load platform-specific expertise
    on-demand via the load_skill tool.
    """
    try:
        # Validate platform
        if request.platform not in PLATFORM_GUIDELINES:
            raise ValueError(f"Unsupported platform: {request.platform}")
        
        # Build system prompt with skill routing
        system_prompt = build_improvement_system_prompt(
            request.platform,
            request.postType
        )
        
        user_prompt = f'Improve this content for {request.platform}:\n\n"{request.description}"'
        if request.additionalInstructions:
            user_prompt += f"\n\nAdditional Instructions: {request.additionalInstructions}"
        
        # Create model
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-pro",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.7,
        )
        
        # Create agent with SkillMiddleware
        # The middleware:
        # 1. Injects available platform skills into system prompt
        # 2. Registers load_skill tool
        agent = create_agent(
            model=model,
            tools=[],
            system_prompt=system_prompt,
            middleware=[SkillMiddleware()],
        )
        
        # Invoke agent
        result = await agent.ainvoke({
            "messages": [{"role": "user", "content": user_prompt}]
        })
        
        # Extract improved description
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
            text_parts = []
            for block in raw_content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_parts.append(block)
            improved_description = "\n".join(text_parts)
        else:
            improved_description = str(raw_content)
        
        improved_description = improved_description.strip()
        
        if not improved_description:
            raise ValueError("Agent returned empty response")
        
        logger.info(f"Content improved for {request.platform} using skills pattern")
        
        return ImproveContentResponse(
            success=True,
            improvedDescription=improved_description,
            metadata={
                "platform": request.platform,
                "postType": request.postType
            }
        )
        
    except Exception as e:
        logger.error(f"Content improvement error: {e}", exc_info=True)
        raise
