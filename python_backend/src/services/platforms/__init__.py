"""Platform-specific services"""
from .linkedin_service import linkedin_service, close_linkedin_service
from .twitter_service import twitter_service, close_twitter_service

__all__ = [
    "linkedin_service",
    "close_linkedin_service",
    "twitter_service",
    "close_twitter_service"
]
