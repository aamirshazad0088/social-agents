"""Social Media API Routes"""
from .facebook import router as facebook_router
from .instagram import router as instagram_router
from .linkedin import router as linkedin_router

__all__ = ["facebook_router", "instagram_router", "linkedin_router"]
