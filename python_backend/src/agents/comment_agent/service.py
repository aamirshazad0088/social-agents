"""
Comment Agent Service
Main autonomous agent for processing and responding to comments
"""
import logging
import time
from typing import Optional, List

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool

from .schemas import (
    ProcessCommentsRequest,
    ProcessCommentsResponse,
    ProcessingResult,
)
from .prompts import get_comment_agent_system_prompt
from ...services import is_supabase_configured, db_insert, db_select, db_update
from ...services.llm_factory import LLMFactory
from ...config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# TOOLS FOR COMMENT AGENT
# ============================================================================

@tool
def search_company_knowledge(query: str, workspace_id: str) -> str:
    """
    Search the company knowledge base for relevant information.
    
    Args:
        query: Search query based on the comment content
        workspace_id: The workspace ID to search in
    """
    # This would normally query Supabase knowledge_entries table
    # For now, return empty to trigger escalation
    logger.info(f"Searching knowledge base: {query}")
    return "No matching knowledge found. Consider escalating to user."


@tool
def escalate_to_user(
    comment_id: str,
    post_id: str,
    platform: str,
    workspace_id: str,
    username: str,
    original_comment: str,
    summary: str
) -> str:
    """
    Escalate a comment to the user for manual review.
    
    Args:
        comment_id: ID of the comment
        post_id: ID of the post
        platform: Platform (instagram, facebook, youtube)
        workspace_id: Workspace ID
        username: Commenter's username
        original_comment: Full original comment text
        summary: Brief summary of why this needs user attention
    """
    logger.info(f"Escalating comment from {username}: {summary}")
    return f"Comment escalated to user: {summary}"


@tool
def reply_to_comment(comment_id: str, message: str, platform: str) -> str:
    """
    Reply to a comment on Instagram or Facebook.
    
    Args:
        comment_id: ID of the comment to reply to
        message: Reply message
        platform: Either 'instagram' or 'facebook'
    """
    logger.info(f"Replying to {platform} comment {comment_id}: {message}")
    return f"Reply posted successfully on {platform}"


@tool
def reply_to_youtube_comment(comment_id: str, message: str) -> str:
    """
    Reply to a YouTube comment.
    
    Args:
        comment_id: ID of the comment to reply to
        message: Reply message
    """
    logger.info(f"Replying to YouTube comment {comment_id}: {message}")
    return "Reply posted successfully on YouTube"


@tool
def fetch_recent_posts(access_token: str, platform: str, limit: int = 10) -> str:
    """
    Fetch recent posts from Instagram or Facebook.
    
    Args:
        access_token: Meta API access token
        platform: Either 'instagram' or 'facebook'
        limit: Number of posts to fetch
    """
    logger.info(f"Fetching recent {platform} posts")
    return f"Fetched {limit} recent posts from {platform}"


@tool
def fetch_comments_for_post(post_id: str, access_token: str) -> str:
    """
    Fetch comments for a specific post.
    
    Args:
        post_id: ID of the post
        access_token: Meta API access token
    """
    logger.info(f"Fetching comments for post {post_id}")
    return "No unanswered comments found"


# ============================================================================
# MAIN AGENT FUNCTION
# ============================================================================

async def process_comments(request: ProcessCommentsRequest) -> ProcessCommentsResponse:
    """
    Process comments as a personal assistant.
    
    - Searches knowledge base first
    - Auto-replies when confident
    - Escalates to user when unsure
    
    Args:
        request: Process comments request
        
    Returns:
        ProcessCommentsResponse with stats
    """
    start_time = time.time()
    workspace_id = request.workspaceId
    platforms = request.platforms or ["instagram", "facebook", "youtube"]
    run_type = request.runType or "cron"
    
    logger.info(f"Processing comments for workspace {workspace_id}, platforms: {platforms}")
    
    # Create log entry if Supabase is configured
    log_id: Optional[str] = None
    if is_supabase_configured():
        try:
            result = await db_insert("comment_agent_logs", {
                "workspace_id": workspace_id,
                "run_type": run_type,
                "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            if result.get("success") and result.get("data"):
                log_id = result["data"][0].get("id")
        except Exception as e:
            logger.warning(f"Could not create log entry: {e}")
    
    try:
        # Initialize LLM
        llm_factory = LLMFactory()
        model = llm_factory.create_model(
            model_id="gpt-4o",
            temperature=0.3  # Lower for consistent responses
        )
        
        if not model:
            return ProcessCommentsResponse(
                success=False,
                executionTime=int((time.time() - start_time) * 1000),
                errorMessage="No LLM model available. Configure OPENAI_API_KEY."
            )
        
        # Create tools list
        tools = [
            search_company_knowledge,
            escalate_to_user,
            reply_to_comment,
            reply_to_youtube_comment,
            fetch_recent_posts,
            fetch_comments_for_post,
        ]
        
        # Bind tools to model
        model_with_tools = model.bind_tools(tools)
        
        # Build instruction
        platform_list = " and ".join(platforms)
        if request.postIds and len(request.postIds) > 0:
            instruction = f"Process comments for these specific posts: {', '.join(request.postIds)} on {platform_list}. For each comment, search knowledge first, then either reply or escalate."
        else:
            instruction = f"Fetch recent posts from {platform_list} and process their unanswered comments. For each comment, search the knowledge base first, then either auto-reply if you find relevant info, or escalate to the user if you need their expertise."
        
        # Run the agent
        messages = [
            SystemMessage(content=get_comment_agent_system_prompt()),
            HumanMessage(content=instruction)
        ]
        
        response = await model_with_tools.ainvoke(messages)
        
        # Parse response - in production this would track actual actions
        # For now, return demo stats
        result = ProcessingResult(
            summary=f"Processed comments on {platform_list}",
            autoReplied=0,
            escalated=0,
            skipped=0,
            errors=0
        )
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Update log entry
        if log_id and is_supabase_configured():
            try:
                await db_update("comment_agent_logs", {
                    "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "comments_fetched": result.autoReplied + result.escalated + result.skipped,
                    "auto_replied": result.autoReplied,
                    "escalated": result.escalated,
                    "errors": result.errors,
                }, {"id": log_id})
            except Exception as e:
                logger.warning(f"Could not update log entry: {e}")
        
        logger.info(f"Comment processing complete in {execution_time}ms")
        
        return ProcessCommentsResponse(
            success=True,
            commentsFetched=result.autoReplied + result.escalated + result.skipped,
            autoReplied=result.autoReplied,
            escalated=result.escalated,
            errors=result.errors,
            executionTime=execution_time
        )
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Comment processing error: {e}", exc_info=True)
        
        execution_time = int((time.time() - start_time) * 1000)
        
        # Update log with error
        if log_id and is_supabase_configured():
            try:
                await db_update("comment_agent_logs", {
                    "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "errors": 1,
                    "error_message": error_message,
                }, {"id": log_id})
            except Exception as log_error:
                logger.warning(f"Could not update log entry: {log_error}")
        
        return ProcessCommentsResponse(
            success=False,
            commentsFetched=0,
            autoReplied=0,
            escalated=0,
            errors=1,
            executionTime=execution_time,
            errorMessage=error_message
        )
