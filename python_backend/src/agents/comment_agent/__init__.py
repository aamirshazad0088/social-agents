"""Comment Agent - Main Export"""
from .service import process_comments
from .schemas import (
    ProcessCommentsRequest,
    ProcessCommentsResponse,
    CommentAgentCredentials,
    CommentPlatform,
    RawComment,
    PendingComment,
    KnowledgeEntry,
)
from .prompts import get_comment_agent_system_prompt

__all__ = [
    "process_comments",
    "ProcessCommentsRequest",
    "ProcessCommentsResponse",
    "CommentAgentCredentials",
    "CommentPlatform",
    "RawComment",
    "PendingComment",
    "KnowledgeEntry",
    "get_comment_agent_system_prompt",
]
