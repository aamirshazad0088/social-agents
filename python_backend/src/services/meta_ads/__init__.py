"""
Meta Ads Services Module
Consolidates all Meta Ads and SDK-related service classes.

Usage:
    from src.services.meta_ads import get_meta_ads_service
    from src.services.meta_ads import MetaCredentialsService
    from src.services.meta_ads import create_meta_sdk_client
"""

# Core services
from .meta_ads_service import get_meta_ads_service, MetaAdsService
from .meta_credentials_service import MetaCredentialsService
from .meta_sdk_client import create_meta_sdk_client, MetaSDKClient

# SDK Feature services
from .sdk_ad_library import AdLibraryService
from .sdk_ad_preview import AdPreviewService
from .sdk_async_reports import AsyncReportsService
from .sdk_business_assets import BusinessAssetsService
from .sdk_custom_conversions import CustomConversionsService
from .sdk_lead_forms import LeadFormsService
from .sdk_offline_conversions import OfflineConversionsService
from .sdk_pixels import PixelsService
from .sdk_reach_estimation import ReachEstimationService
from .sdk_saved_audiences import SavedAudiencesService
from .sdk_targeting import TargetingService
from .sdk_videos import VideosService

__all__ = [
    # Core
    "get_meta_ads_service",
    "MetaAdsService",
    "MetaCredentialsService",
    "create_meta_sdk_client",
    "MetaSDKClient",
    # SDK Features
    "AdLibraryService",
    "AdPreviewService",
    "AsyncReportsService",
    "BusinessAssetsService",
    "CustomConversionsService",
    "LeadFormsService",
    "OfflineConversionsService",
    "PixelsService",
    "ReachEstimationService",
    "SavedAudiencesService",
    "TargetingService",
    "VideosService",
]
