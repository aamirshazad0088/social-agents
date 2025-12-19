"""
Content Strategist Chat Service
Expert multi-platform content strategist using LangChain's create_agent with structured output
"""
import logging
import time
import base64
from uuid import uuid4
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from langchain.agents import create_agent

from .schemas import (
    ChatStrategistRequest,
    ChatStrategistResponse,
    PlatformContent,
    GeneratedContent,
    AttachmentInput
)
from ...services import create_dynamic_model
from .prompts import (
    get_unified_supervisor_system_instruction,
    format_business_context_for_prompt,
    PLATFORMS
)
from .memory import get_content_agent_memory

logger = logging.getLogger(__name__)


# ============================================================================
# STRUCTURED OUTPUT SCHEMAS (Pydantic)
# ============================================================================

class ConversationalResponse(BaseModel):
    """Conversational response when gathering information"""
    message: str


class ContentGenerationResponse(BaseModel):
    """Content generation response with platform-specific content"""
    contents: List[PlatformContent]


# ============================================================================
# DOCUMENT/IMAGE PROCESSING
# ============================================================================

def detect_file_type(attachment: AttachmentInput) -> str:
    """Detect file type from attachment"""
    if attachment.type == "image":
        return "image"
    return "document"


def get_image_data_url(attachment: AttachmentInput) -> str:
    """Get data URL for image attachment"""
    mime_type = attachment.mimeType or "image/jpeg"
    return f"data:{mime_type};base64,{attachment.data}"


async def load_document(attachment: AttachmentInput) -> str:
    """
    Load document content from attachment
    
    Args:
        attachment: Document attachment
        
    Returns:
        Document text content
    """
    try:
        # Decode base64 data
        decoded_data = base64.b64decode(attachment.data)
        
        # For text-based documents, decode as UTF-8
        if attachment.type in ["text", "csv", "json"]:
            return decoded_data.decode("utf-8")
        
        # For PDFs and other documents, you would use appropriate parsers
        # For now, return a placeholder
        return f"[Document content from {attachment.name} - {len(decoded_data)} bytes]"
        
    except Exception as e:
        logger.error(f"Error loading document {attachment.name}: {e}")
        return f"[Error loading document: {str(e)}]"


# ============================================================================
# CONTENT STRATEGIST CHAT SERVICE
# ============================================================================

async def content_strategist_chat(
    request: ChatStrategistRequest
) -> ChatStrategistResponse:
    """
    Content strategist chat service with multimodal support
    
    Workflow: CONSULT → CONFIRM → GENERATE → DELIVER
    
    Response Modes:
    - ConversationalResponse: For chatting and gathering info
    - ContentGenerationResponse: For delivering generated content
    
    Args:
        request: Chat strategist request with message, attachments, context
        
    Returns:
        ChatStrategistResponse with conversational response or generated content
    """
    start_time = time.time()
    
    message = request.message
    thread_id = request.threadId or str(uuid4())
    attachments = request.attachments or []
    business_context = request.businessContext
    model_id = request.modelId
    
    platform_list = ", ".join(PLATFORMS)
    
    logger.info(f"Processing chat request - Thread: {thread_id}, Model: {model_id}")
    
    # Get memory layer (checkpointer and store)
    memory = await get_content_agent_memory()
    
    # Check if any attachments are images for vision model
    has_images = any(detect_file_type(att) == "image" for att in attachments)
    
    # Use dynamic model selection - default to gpt-4o for vision support
    if has_images and not model_id:
        resolved_model_id = "openai:gpt-4o"
        logger.info("Vision model selected due to image attachments")
    else:
        resolved_model_id = model_id or "google-genai:gemini-3-flash-preview"
    
    # Create model instance
    model = await create_dynamic_model(resolved_model_id)
    
    # Build system prompt with business context
    base_prompt = get_unified_supervisor_system_instruction(platform_list)
    business_context_prompt = format_business_context_for_prompt(
        business_context.dict() if business_context else None
    )
    system_prompt = base_prompt + business_context_prompt
    
    # Create agent (simplified - no structured output for now)
    agent = create_agent(
        model=model,
        tools=[],  # No tools for now
        system_prompt=system_prompt,
        checkpointer=memory.checkpointer,
        store=memory.store
    )
    
    # Process attachments and create multimodal message content
    message_content: str | List[Dict[str, Any]]
    
    if attachments:
        # Build multimodal content array
        content_parts: List[Dict[str, Any]] = [
            {"type": "text", "text": message}
        ]
        
        # Process each attachment
        for attachment in attachments:
            file_type = detect_file_type(attachment)
            
            if file_type == "image":
                # Add image for vision model (OpenAI format)
                image_url = get_image_data_url(attachment)
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": image_url}
                })
                logger.info(f"Added image attachment: {attachment.name}")
            
            else:
                # Load document content and add as text
                try:
                    doc_content = await load_document(attachment)
                    content_parts.append({
                        "type": "text",
                        "text": f"\n\n--- Attached Document: {attachment.name} ---\n{doc_content}"
                    })
                    logger.info(f"Added document attachment: {attachment.name}")
                except Exception as e:
                    logger.error(f"Error loading attachment {attachment.name}: {e}")
                    content_parts.append({
                        "type": "text",
                        "text": f"\n\n[Error loading {attachment.name}]"
                    })
        
        message_content = content_parts
    else:
        message_content = message
    
    # Invoke agent
    try:
        result = await agent.invoke(
            {"messages": [{"role": "user", "content": message_content}]},
            config={"configurable": {"thread_id": thread_id}}
        )
        
        logger.info(f"Agent invoked successfully - Thread: {thread_id}")
        
    except Exception as e:
        logger.error(f"Agent invocation error: {e}", exc_info=True)
        raise
    
    # Extract structured response
    structured_response = result.get("structured_response")
    messages = result.get("messages", [])
    final_message = messages[-1] if messages else None
    
    # Calculate generation time
    generation_time_ms = int((time.time() - start_time) * 1000)
    
    # Get conversational response text
    if final_message:
        conversational_response = (
            final_message.get("content", "")
            if isinstance(final_message, dict)
            else str(final_message.content) if hasattr(final_message, "content") else ""
        )
    else:
        conversational_response = ""
    
    # Handle structured response
    if structured_response:
        # Check if it's ContentGenerationResponse (has 'contents' field)
        if isinstance(structured_response, ContentGenerationResponse):
            logger.info(f"Content generated: {len(structured_response.contents)} platforms")
            
            return ChatStrategistResponse(
                success=True,
                response=conversational_response or "Content generated successfully",
                threadId=thread_id,
                contentGenerated=True,
                generatedContent=GeneratedContent(contents=structured_response.contents),
                generatedAt=int(time.time() * 1000),
                generationTime=generation_time_ms
            )
        
        # It's ConversationalResponse (has 'message' field)
        elif isinstance(structured_response, ConversationalResponse):
            return ChatStrategistResponse(
                success=True,
                response=structured_response.message,
                threadId=thread_id,
                contentGenerated=False,
                generatedAt=int(time.time() * 1000),
                generationTime=generation_time_ms
            )
    
    # Fallback response
    return ChatStrategistResponse(
        success=True,
        response=conversational_response or "Request processed",
        threadId=thread_id,
        contentGenerated=False,
        generatedAt=int(time.time() * 1000),
        generationTime=generation_time_ms
    )
