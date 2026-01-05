"""Custom tools for the Voice Agent."""

from google.adk.tools import FunctionTool


def write_content(content: str) -> dict:
    """Deliver formatted written content to the user.
    
    Use this tool when:
    - User asks for content in written form (captions, posts, scripts, etc.)
    - User wants text they can copy or use
    - User asks you to 'write', 'create', 'draft', or 'generate' content
    - User needs documentation or formatted text
    
    Always use proper markdown formatting for better readability.
    
    Args:
        content: The written content with proper markdown formatting
        
    Returns:
        A dictionary with success status and the content
    """
    return {"success": True, "content": content}


# Create FunctionTool from the function - tool name will be "write_content"
write_content_tool = FunctionTool(func=write_content)
