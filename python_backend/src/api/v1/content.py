"""
Content Agent API Routes
"""
import logging
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ...agents.content_strategist_agent import (
    content_strategist_chat,
    ChatStrategistRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/content", tags=["content"])


@router.post("/strategist/chat")
async def chat_strategist(request_body: ChatStrategistRequest):
    """
    POST /api/v1/content/strategist/chat
    
    Stream chat with content strategist agent.
    Memory handled automatically via thread_id.
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        full_response = ""
        
        async for chunk in content_strategist_chat(request_body):
            step = chunk.get("step", "")
            content = chunk.get("content", "")
            
            if step == "error":
                yield f"data: {json.dumps({'type': 'error', 'message': content})}\n\n"
                return
            
            if content:
                full_response = content
                yield f"data: {json.dumps({'type': 'update', 'step': step, 'content': content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done', 'response': full_response})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
