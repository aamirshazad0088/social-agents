"""
Meta Ads API Router Module
Aggregates all Meta Ads sub-routers into a single router.

This module provides a unified router for all Meta Ads functionality,
including core operations (campaigns, ad sets, ads, audiences, etc.)
and SDK features (reach estimation, targeting, previews, etc.).

Usage:
    from src.api.v1.meta_ads import router
    app.include_router(router)
"""

from fastapi import APIRouter

# Core Meta Ads routers
from .status import router as status_router
from .auth import router as auth_router
from .business import router as business_router
from .campaigns import router as campaigns_router
from .adsets import router as adsets_router
from .ads import router as ads_router
from .bulk import router as bulk_router
from .drafts import router as drafts_router
from .audiences import router as audiences_router
from .analytics import router as analytics_router
from .rules import router as rules_router
from .creative import router as creative_router
from .capi import router as capi_router
from .compliance import router as compliance_router
from .reports import router as reports_router
from .competitors import router as competitors_router
from .settings import router as settings_router
from .pixels import router as pixels_router

# SDK Feature routers
from .sdk_reach import router as sdk_reach_router
from .sdk_targeting import router as sdk_targeting_router
from .sdk_audiences import router as sdk_audiences_router
from .sdk_lead_forms import router as sdk_lead_forms_router
from .sdk_pixels import router as sdk_pixels_router
from .sdk_videos import router as sdk_videos_router
from .sdk_business import router as sdk_business_router
from .sdk_conversions import router as sdk_conversions_router
from .sdk_preview import router as sdk_preview_router
from .sdk_library import router as sdk_library_router
from .sdk_reports import router as sdk_reports_router

# Create main router with same prefix as original meta_ads.py
router = APIRouter(prefix="/api/v1/meta-ads", tags=["Meta Ads"])

# Include all core routers
router.include_router(status_router)
router.include_router(auth_router)
router.include_router(business_router)
router.include_router(campaigns_router)
router.include_router(adsets_router)
router.include_router(ads_router)
router.include_router(bulk_router)
router.include_router(drafts_router)
router.include_router(audiences_router)
router.include_router(analytics_router)
router.include_router(rules_router)
router.include_router(creative_router)
router.include_router(capi_router)
router.include_router(compliance_router)
router.include_router(reports_router)
router.include_router(competitors_router)
router.include_router(settings_router)
router.include_router(pixels_router)

# Include SDK feature routers (they already have /sdk prefix)
router.include_router(sdk_reach_router)
router.include_router(sdk_targeting_router)
router.include_router(sdk_audiences_router)
router.include_router(sdk_lead_forms_router)
router.include_router(sdk_pixels_router)
router.include_router(sdk_videos_router)
router.include_router(sdk_business_router)
router.include_router(sdk_conversions_router)
router.include_router(sdk_preview_router)
router.include_router(sdk_library_router)
router.include_router(sdk_reports_router)

# Export helpers for other modules that may need them
from ._helpers import get_user_context, get_verified_credentials, generate_appsecret_proof

__all__ = [
    "router",
    "get_user_context",
    "get_verified_credentials",
    "generate_appsecret_proof"
]
