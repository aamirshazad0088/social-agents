"""
Comment Agent API Routes
Endpoints for AI-powered comment management
"""
import logging
from fastapi import APIRouter, HTTPException, Request

from ...agents.comment_agent import (
    process_comments,
    ProcessCommentsRequest,
    ProcessCommentsResponse,
)
from ...services import is_supabase_configured, db_select, db_delete

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/comments", tags=["Comment Agent"])


@router.post("/process", response_model=ProcessCommentsResponse)
async def api_process_comments(request: ProcessCommentsRequest):
    """
    Process comments across social media platforms
    
    The agent will:
    - Search knowledge base for relevant info
    - Auto-reply when confident
    - Escalate to user when unsure
    """
    try:
        logger.info(f"Processing comments for workspace: {request.workspaceId}")
        result = await process_comments(request)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.errorMessage)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comment processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending/{workspace_id}")
async def get_pending_comments(workspace_id: str, limit: int = 50):
    """
    Get pending comments that need user review
    """
    try:
        if not is_supabase_configured():
            return {"success": True, "comments": [], "stats": {"pending": 0, "total": 0}}
        
        result = await db_select(
            table="pending_comments",
            columns="*",
            filters={"workspace_id": workspace_id, "status": "pending"},
            limit=limit,
            order_by="created_at"
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        comments = result.get("data", [])
        
        return {
            "success": True,
            "comments": comments,
            "stats": {
                "pending": len(comments),
                "total": len(comments)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get pending comments error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/pending/{comment_id}")
async def dismiss_pending_comment(comment_id: str, workspace_id: str):
    """
    Dismiss a pending comment (remove from queue without replying)
    """
    try:
        if not is_supabase_configured():
            return {"success": True, "message": "Comment dismissed"}
        
        result = await db_delete(
            table="pending_comments",
            filters={"id": comment_id, "workspace_id": workspace_id}
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        return {"success": True, "message": "Comment dismissed"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dismiss comment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{workspace_id}")
async def get_agent_logs(workspace_id: str, limit: int = 20):
    """
    Get recent comment agent run logs
    """
    try:
        if not is_supabase_configured():
            return {"success": True, "logs": []}
        
        result = await db_select(
            table="comment_agent_logs",
            columns="*",
            filters={"workspace_id": workspace_id},
            limit=limit,
            order_by="started_at"
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error"))
        
        return {
            "success": True,
            "logs": result.get("data", [])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get logs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def comments_info():
    """Comment Agent API information"""
    return {
        "success": True,
        "message": "Comment Agent API is operational",
        "version": "1.0.0",
        "endpoints": {
            "process": "POST /process - Process comments",
            "pending": "GET /pending/{workspace_id} - Get pending comments",
            "dismiss": "DELETE /pending/{comment_id} - Dismiss pending comment",
            "logs": "GET /logs/{workspace_id} - Get agent run logs"
        }
    }
