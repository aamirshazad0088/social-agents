"""
Content Strategist Agent - Subagents Module

Subagent definitions and loader for the content strategist.
Subagents are specialized agents that handle delegated tasks.
"""
import logging
import yaml
from pathlib import Path
from typing import List, Dict, Any

from ..tools import web_search

logger = logging.getLogger(__name__)


def get_available_tools() -> Dict[str, Any]:
    """Get mapping of tool names to tool objects."""
    return {
        "web_search": web_search,
    }


def load_subagents(config_path: Path) -> List[Dict[str, Any]]:
    """
    Load subagent definitions from YAML config.
    
    This follows the content-builder-agent pattern where subagents
    are defined in YAML for easy configuration.
    
    Args:
        config_path: Path to subagents.yaml
        
    Returns:
        List of subagent dictionaries for create_deep_agent
    """
    available_tools = get_available_tools()
    
    if not config_path.exists():
        logger.warning(f"Subagents config not found: {config_path}")
        return []
    
    try:
        with open(config_path) as f:
            config = yaml.safe_load(f)
        
        if not config:
            return []
        
        subagents = []
        for name, spec in config.items():
            subagent = {
                "name": name,
                "description": spec.get("description", ""),
                "system_prompt": spec.get("system_prompt", ""),
            }
            # Wire up tools by name
            if "tools" in spec:
                subagent["tools"] = [
                    available_tools[t] 
                    for t in spec["tools"] 
                    if t in available_tools
                ]
            subagents.append(subagent)
        
        logger.info(f"Loaded {len(subagents)} subagents from config")
        return subagents
    except Exception as e:
        logger.error(f"Error loading subagents: {e}")
        return []


__all__ = ["load_subagents", "get_available_tools"]
