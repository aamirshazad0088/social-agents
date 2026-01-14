"""
Content Strategist Agent - Configuration Module

Centralized configuration and constants for the agent.
"""
from pathlib import Path

# Agent directory (root of content_strategist_agent package)
AGENT_DIR = Path(__file__).parent.parent

# Configuration file paths
AGENTS_MD_PATH = AGENT_DIR / "AGENTS.md"
SUBAGENTS_YAML_PATH = AGENT_DIR / "subagents.yaml"
SKILLS_DIR = AGENT_DIR / "skills"

# Model configuration
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_TEMPERATURE = 0.7


def get_memory_files() -> list:
    """Get list of memory file paths for create_deep_agent."""
    return [str(AGENTS_MD_PATH)]


def get_skills_dirs() -> list:
    """Get list of skill directory paths for create_deep_agent."""
    return [str(SKILLS_DIR)]


__all__ = [
    "AGENT_DIR",
    "AGENTS_MD_PATH",
    "SUBAGENTS_YAML_PATH",
    "SKILLS_DIR",
    "DEFAULT_MODEL",
    "DEFAULT_TEMPERATURE",
    "get_memory_files",
    "get_skills_dirs",
]
