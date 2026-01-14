"""
Content Strategist Agent - Tools Module

Tools for the content strategist agent defined using @tool decorator.
Following the content-builder-agent pattern from deepagents.
"""
import os
from typing import Literal

from langchain_core.tools import tool


@tool
def web_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news"] = "general",
) -> dict:
    """Search the web for current information and trends.
    
    Args:
        query: The search query (be specific and detailed)
        max_results: Number of results to return (default: 5)
        topic: "general" for most queries, "news" for current events
        
    Returns:
        Search results with titles, URLs, and content excerpts.
    """
    try:
        from tavily import TavilyClient
        
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            return {"error": "TAVILY_API_KEY not set. Web search unavailable."}
        
        client = TavilyClient(api_key=api_key)
        return client.search(query, max_results=max_results, topic=topic)
    except ImportError:
        return {"error": "tavily package not installed"}
    except Exception as e:
        return {"error": f"Search failed: {e}"}


@tool
def generate_content_image(prompt: str, platform: str, content_type: str) -> str:
    """Generate an image for social media content.
    
    Args:
        prompt: Detailed description of the image to generate.
        platform: Target platform (instagram, linkedin, twitter, etc.)
        content_type: Type of content (post, story, cover, etc.)
        
    Returns:
        Status message about image generation.
    """
    try:
        from google import genai
        
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=[prompt],
        )
        
        for part in response.parts:
            if part.inline_data is not None:
                return f"Image generated successfully for {platform}/{content_type}"
        
        return "No image generated - try a more detailed prompt"
    except ImportError:
        return "google-genai package not available for image generation"
    except Exception as e:
        return f"Image generation error: {e}"


# Export all tools
__all__ = [
    "web_search",
    "generate_content_image",
]
