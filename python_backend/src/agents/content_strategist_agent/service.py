"""
Content Strategist Agent - Main Service
DeepAgents-based implementation with memory, skills, and subagents.

This is the main entry point. Components are organized in:
- config/: Configuration and constants
- tools/: Tool definitions (@tool decorated functions)
- subagents/: Subagent loader and definitions
- checkpointer/: Database persistence
- utils/: Helper functions
- skills/: Platform-specific SKILL.md files
"""
import logging
from typing import AsyncGenerator

from deepagents import create_deep_agent
from langchain_google_genai import ChatGoogleGenerativeAI

from .config import (
    SUBAGENTS_YAML_PATH,
    DEFAULT_MODEL,
    DEFAULT_TEMPERATURE,
    get_memory_files,
    get_skills_dirs,
)
from .tools import (
    web_search,
    get_today_entries,
    get_tomorrow_entries,
    get_week_calendar,
    add_calendar_entry,
    add_weekly_content_plan,
    find_and_update_entry,
    find_and_delete_entry,
    clear_day,
    set_workspace_id,
)
from .subagents import load_subagents
from .checkpointer import init_checkpointer, close_checkpointer, get_checkpointer
from .utils import build_multimodal_content
from .schemas import ChatStrategistRequest
from ...config import settings

logger = logging.getLogger(__name__)

# Global agent reference
_agent = None


# =============================================================================
# Agent Creation
# =============================================================================

async def get_agent():
    """
    Get or create the content strategist agent.
    
    Uses deepagents create_deep_agent with:
    - memory: AGENTS.md loaded into system prompt
    - skills: Platform-specific SKILL.md files loaded on demand
    - tools: web_search, calendar tools (no IDs needed!)
    - subagents: researcher, media_prompt_expert, content_editor
    """
    global _agent
    
    if _agent is not None:
        return _agent
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro",
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=DEFAULT_TEMPERATURE,
    )
    
    _agent = create_deep_agent(
        model=model,
        memory=get_memory_files(),
        skills=get_skills_dirs(),
        tools=[
            web_search,
            # Calendar - View
            get_today_entries,
            get_tomorrow_entries,
            get_week_calendar,
            # Calendar - Add
            add_calendar_entry,
            add_weekly_content_plan,
            # Calendar - Modify (no IDs needed!)
            find_and_update_entry,
            find_and_delete_entry,
            clear_day,
        ],
        subagents=load_subagents(SUBAGENTS_YAML_PATH),
        checkpointer=get_checkpointer(),
    )
    logger.info("Content strategist deep agent created")
    
    return _agent


# =============================================================================
# Thread History
# =============================================================================

async def get_thread_history(thread_id: str) -> dict:
    """
    Fetch conversation history from LangGraph checkpoints.
    
    Args:
        thread_id: The LangGraph thread ID
        
    Returns:
        dict with messages array and metadata
    """
    checkpointer = get_checkpointer()
    logger.info(f"Fetching history for thread: {thread_id}")
    
    try:
        checkpoint = await checkpointer.aget({"configurable": {"thread_id": thread_id}})
        
        if not checkpoint:
            return {"messages": [], "threadId": thread_id, "messageCount": 0}
        
        messages_raw = checkpoint.get("channel_values", {}).get("messages", [])
        
        ui_messages = []
        for msg in messages_raw:
            msg_type = getattr(msg, 'type', None) or msg.get('type', '') if isinstance(msg, dict) else None
            
            if msg_type in ('tool', 'function', 'system'):
                continue
            
            if hasattr(msg, 'tool_call_id') or (isinstance(msg, dict) and msg.get('tool_call_id')):
                continue
            
            role = 'user'
            if msg_type in ('ai', 'assistant', 'AIMessage'):
                role = 'assistant'
            elif hasattr(msg, '_type') and 'ai' in str(msg._type).lower():
                role = 'assistant'
            
            content = ''
            if hasattr(msg, 'content'):
                content = msg.content
            elif isinstance(msg, dict) and 'content' in msg:
                content = msg['content']
            
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get('type') == 'text':
                        text_parts.append(part.get('text', ''))
                    elif isinstance(part, str):
                        text_parts.append(part)
                content = '\n'.join(text_parts)
            
            if content:
                ui_messages.append({"role": role, "content": content})
        
        return {
            "success": True,
            "messages": ui_messages,
            "threadId": thread_id,
            "messageCount": len(ui_messages)
        }
        
    except Exception as e:
        logger.error(f"Error fetching thread history: {e}")
        return {"success": False, "messages": [], "threadId": thread_id, "error": str(e)}


# =============================================================================
# Chat Handler
# =============================================================================

async def content_strategist_chat(
    request: ChatStrategistRequest
) -> AsyncGenerator[dict, None]:
    """
    Stream chat with the content strategist agent.
    
    Supports multimodal input via contentBlocks.
    Memory handled automatically via thread_id.
    
    Streams only the final AI response (filters out tool messages).
    """
    from langchain_core.messages import AIMessageChunk, ToolMessage
    
    try:
        thread_id = request.threadId
        logger.info(f"Content strategist - Thread: {thread_id}")
        
        message_content = build_multimodal_content(
            request.message, 
            request.contentBlocks
        )
        
        # Set workspace_id for calendar tools before agent runs
        if request.workspaceId:
            set_workspace_id(request.workspaceId)
            logger.info(f"Workspace ID set for calendar tools: {request.workspaceId}")
        
        agent = await get_agent()
        accumulated_content = ""
        
        async for event in agent.astream(
            {"messages": [{"role": "user", "content": message_content}]},
            {"configurable": {"thread_id": thread_id}},
            stream_mode="messages",
        ):
            if isinstance(event, tuple) and len(event) == 2:
                message_chunk, metadata = event
                
                # Skip ToolMessages - only stream AIMessageChunks
                # Reference: https://python.langchain.com/docs/how_to/streaming/
                if isinstance(message_chunk, ToolMessage):
                    continue
                
                # Only process AIMessageChunks (the actual LLM response)
                if not isinstance(message_chunk, AIMessageChunk):
                    continue
                
                # Skip if this is a tool call chunk (has tool_calls or tool_call_chunks)
                if hasattr(message_chunk, 'tool_calls') and message_chunk.tool_calls:
                    continue
                if hasattr(message_chunk, 'tool_call_chunks') and message_chunk.tool_call_chunks:
                    continue
                
                if hasattr(message_chunk, 'content'):
                    chunk_content = message_chunk.content
                    
                    if isinstance(chunk_content, list):
                        for block in chunk_content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                text = block.get("text", "")
                                if text:
                                    accumulated_content += text
                                    yield {"step": "streaming", "content": accumulated_content}
                    elif isinstance(chunk_content, str) and chunk_content:
                        accumulated_content += chunk_content
                        yield {"step": "streaming", "content": accumulated_content}
        
        logger.info(f"Content strategist completed - Thread: {thread_id}")
        
    except Exception as e:
        logger.error(f"Content strategist error: {e}", exc_info=True)
        yield {"step": "error", "content": str(e)}

