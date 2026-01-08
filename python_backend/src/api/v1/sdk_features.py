"""
SDK Features API Router
Unified API endpoints for all SDK-native services

Includes:
- Reach Estimation
- Saved Audiences
- Targeting
- Lead Forms
- Pixels
- Videos
- Business Assets
- Custom Conversions
- Offline Conversions
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sdk", tags=["SDK Features"])


# Helper to get credentials
async def get_sdk_credentials(request: Request) -> Dict[str, Any]:
    """Extract credentials from request context."""
    from .meta_ads import get_user_context, get_verified_credentials
    user_id, workspace_id = await get_user_context(request)
    return await get_verified_credentials(workspace_id, user_id)


# =============================================================================
# REACH ESTIMATION ENDPOINTS
# =============================================================================

@router.post("/reach/estimate")
async def estimate_reach(request: Request):
    """
    POST /api/v1/meta-ads/sdk/reach/estimate
    
    Estimate reach for targeting spec with dynamic parameters.
    Body: { 
        "targeting_spec": {...}, 
        "budget": 1000,
        "currency": "USD",
        "optimization_goal": "REACH",
        "start_time": 1234567890,
        "end_time": 1234567890
    }
    """
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_reach_estimation import ReachEstimationService
        service = ReachEstimationService(creds["access_token"])
        
        result = await service.get_reach_estimate(
            account_id=creds["account_id"].replace("act_", ""),
            targeting_spec=body.get("targeting_spec", {}),
            optimization_goal=body.get("optimization_goal", "REACH"),
            budget=body.get("budget", 10000),
            currency=body.get("currency", "USD"),
            start_time=body.get("start_time"),
            end_time=body.get("end_time")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Reach estimation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reach/delivery")
async def estimate_delivery(request: Request):
    """
    POST /api/v1/meta-ads/sdk/reach/delivery
    
    Estimate delivery for targeting spec.
    """
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_reach_estimation import ReachEstimationService
        service = ReachEstimationService(creds["access_token"])
        
        result = await service.get_delivery_estimate(
            account_id=creds["account_id"].replace("act_", ""),
            targeting_spec=body.get("targeting_spec", {}),
            optimization_goal=body.get("optimization_goal", "LINK_CLICKS")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Delivery estimation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# SAVED AUDIENCES ENDPOINTS
# =============================================================================

@router.get("/saved-audiences")
async def get_saved_audiences(request: Request):
    """GET /api/v1/meta-ads/sdk/saved-audiences"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_saved_audiences import SavedAudiencesService
        service = SavedAudiencesService(creds["access_token"])
        
        result = await service.get_saved_audiences(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get saved audiences error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/saved-audiences")
async def create_saved_audience(request: Request):
    """POST /api/v1/meta-ads/sdk/saved-audiences"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_saved_audiences import SavedAudiencesService
        service = SavedAudiencesService(creds["access_token"])
        
        result = await service.create_saved_audience(
            account_id=creds["account_id"].replace("act_", ""),
            name=body.get("name"),
            targeting=body.get("targeting", {}),
            description=body.get("description")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Create saved audience error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# TARGETING ENDPOINTS
# =============================================================================

@router.get("/targeting/search")
async def search_targeting(
    request: Request,
    q: str,
    type: str = "adinterest"
):
    """GET /api/v1/meta-ads/sdk/targeting/search"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.search_targeting(
            query=q,
            target_type=type
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Targeting search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/browse")
async def browse_targeting(
    request: Request,
    type: str = "adinterest",
    target_class: str = "interests"
):
    """
    GET /api/v1/meta-ads/sdk/targeting/browse
    Browse targeting options by class (interests, behaviors, etc.)
    """
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.browse_targeting(
            target_type=type,
            targeting_class=target_class
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Targeting browse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/geolocations")
async def get_geolocations(request: Request, q: str):
    """GET /api/v1/meta-ads/sdk/targeting/geolocations"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.get_geo_locations(query=q)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Geolocation search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# LEAD FORMS ENDPOINTS
# =============================================================================

@router.get("/lead-forms")
async def get_lead_forms(request: Request, page_id: str):
    """GET /api/v1/meta-ads/sdk/lead-forms"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_lead_forms import LeadFormsService
        service = LeadFormsService(creds["access_token"])
        
        result = await service.get_lead_forms(page_id=page_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get lead forms error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lead-forms/{form_id}/leads")
async def get_form_leads(request: Request, form_id: str):
    """GET /api/v1/meta-ads/sdk/lead-forms/{form_id}/leads"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_lead_forms import LeadFormsService
        service = LeadFormsService(creds["access_token"])
        
        result = await service.get_leads(form_id=form_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# PIXELS ENDPOINTS
# =============================================================================

@router.get("/pixels")
async def get_pixels(request: Request):
    """GET /api/v1/meta-ads/sdk/pixels"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_pixels import PixelsService
        service = PixelsService(creds["access_token"])
        
        result = await service.get_pixels(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get pixels error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pixels/{pixel_id}/stats")
async def get_pixel_stats(request: Request, pixel_id: str):
    """GET /api/v1/meta-ads/sdk/pixels/{pixel_id}/stats"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_pixels import PixelsService
        service = PixelsService(creds["access_token"])
        
        result = await service.get_pixel_stats(pixel_id=pixel_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get pixel stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# VIDEOS ENDPOINTS
# =============================================================================

@router.get("/videos")
async def get_videos(request: Request):
    """GET /api/v1/meta-ads/sdk/videos"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_videos import VideosService
        service = VideosService(creds["access_token"])
        
        result = await service.get_ad_videos(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get videos error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/videos/upload-url")
async def upload_video_from_url(request: Request):
    """POST /api/v1/meta-ads/sdk/videos/upload-url"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_videos import VideosService
        service = VideosService(creds["access_token"])
        
        result = await service.upload_video_from_url(
            account_id=creds["account_id"].replace("act_", ""),
            video_url=body.get("video_url"),
            title=body.get("title")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Upload video error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# BUSINESS ASSETS ENDPOINTS
# =============================================================================

@router.get("/businesses")
async def get_businesses(request: Request):
    """GET /api/v1/meta-ads/sdk/businesses"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_business_assets import BusinessAssetsService
        service = BusinessAssetsService(creds["access_token"])
        
        result = await service.get_businesses()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get businesses error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/businesses/{business_id}/ad-accounts")
async def get_business_ad_accounts(request: Request, business_id: str):
    """GET /api/v1/meta-ads/sdk/businesses/{business_id}/ad-accounts"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_business_assets import BusinessAssetsService
        service = BusinessAssetsService(creds["access_token"])
        
        result = await service.get_owned_ad_accounts(business_id=business_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get ad accounts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CUSTOM CONVERSIONS ENDPOINTS
# =============================================================================

@router.get("/custom-conversions")
async def get_custom_conversions(request: Request):
    """GET /api/v1/meta-ads/sdk/custom-conversions"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_custom_conversions import CustomConversionsService
        service = CustomConversionsService(creds["access_token"])
        
        result = await service.get_custom_conversions(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get custom conversions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/custom-conversions")
async def create_custom_conversion(request: Request):
    """POST /api/v1/meta-ads/sdk/custom-conversions"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_custom_conversions import CustomConversionsService
        service = CustomConversionsService(creds["access_token"])
        
        result = await service.create_custom_conversion(
            account_id=creds["account_id"].replace("act_", ""),
            name=body.get("name"),
            pixel_id=body.get("pixel_id"),
            custom_event_type=body.get("custom_event_type", "OTHER"),
            rule=body.get("rule"),
            default_conversion_value=body.get("default_conversion_value")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Create custom conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# OFFLINE CONVERSIONS ENDPOINTS
# =============================================================================

@router.get("/offline-conversions/datasets")
async def get_offline_datasets(request: Request, business_id: str):
    """GET /api/v1/meta-ads/sdk/offline-conversions/datasets"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_offline_conversions import OfflineConversionsService
        service = OfflineConversionsService(creds["access_token"])
        
        result = await service.get_offline_datasets(business_id=business_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get offline datasets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/offline-conversions/datasets/{dataset_id}/events")
async def upload_offline_events(request: Request, dataset_id: str):
    """POST /api/v1/meta-ads/sdk/offline-conversions/datasets/{dataset_id}/events"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_offline_conversions import OfflineConversionsService
        service = OfflineConversionsService(creds["access_token"])
        
        result = await service.upload_offline_events(
            dataset_id=dataset_id,
            events=body.get("events", []),
            upload_tag=body.get("upload_tag")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Upload offline events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# AD PREVIEW ENDPOINTS
# =============================================================================

@router.get("/preview/formats")
async def get_preview_formats():
    """GET /api/v1/meta-ads/sdk/preview/formats - Get available preview formats"""
    from ..services.sdk_ad_preview import PREVIEW_FORMATS
    return JSONResponse(content={"formats": PREVIEW_FORMATS})


@router.get("/preview/ad/{ad_id}")
async def get_ad_preview(
    request: Request,
    ad_id: str,
    format: str = "DESKTOP_FEED_STANDARD"
):
    """GET /api/v1/meta-ads/sdk/preview/ad/{ad_id} - Preview an existing ad"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_ad_preview import AdPreviewService
        service = AdPreviewService(creds["access_token"])
        
        result = await service.get_ad_preview(
            ad_id=ad_id,
            ad_format=format
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Ad preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/ad/{ad_id}/all")
async def get_all_ad_previews(request: Request, ad_id: str):
    """GET /api/v1/meta-ads/sdk/preview/ad/{ad_id}/all - Preview ad in all formats"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_ad_preview import AdPreviewService
        service = AdPreviewService(creds["access_token"])
        
        result = await service.get_all_format_previews(ad_id=ad_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"All format preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview/creative")
async def get_creative_preview(request: Request):
    """POST /api/v1/meta-ads/sdk/preview/creative - Preview from creative spec"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_ad_preview import AdPreviewService
        service = AdPreviewService(creds["access_token"])
        
        result = await service.get_creative_preview(
            account_id=creds["account_id"].replace("act_", ""),
            creative_spec=body.get("creative", {}),
            ad_format=body.get("format", "DESKTOP_FEED_STANDARD")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Creative preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# AD LIBRARY ENDPOINTS (Competitor Analysis)
# =============================================================================

@router.get("/ad-library/search")
async def search_ad_library(
    request: Request,
    q: str,
    page_id: str = None,
    country: str = "US",
    active_status: str = "ALL"
):
    """GET /api/v1/meta-ads/sdk/ad-library/search"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_ad_library import AdLibraryService
        service = AdLibraryService(creds["access_token"])
        
        search_page_ids = [page_id] if page_id else None
        ad_reached_countries = [country] if country else ["US"]
        
        result = await service.search_ads(
            search_terms=q,
            search_page_ids=search_page_ids,
            ad_reached_countries=ad_reached_countries,
            ad_active_status=active_status,
            limit=20
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Ad Library search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ad-library/analyze/{page_id}")
async def analyze_competitor(request: Request, page_id: str):
    """GET /api/v1/meta-ads/sdk/ad-library/analyze/{page_id}"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_ad_library import AdLibraryService
        service = AdLibraryService(creds["access_token"])
        
        result = await service.analyze_competitor_strategy(page_id=page_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Competitor analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ASYNC REPORTS ENDPOINTS
# =============================================================================

@router.post("/reports/async")
async def start_async_report(request: Request):
    """POST /api/v1/meta-ads/sdk/reports/async"""
    try:
        creds = await get_sdk_credentials(request)
        body = await request.json()
        
        from ..services.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.start_report(
            account_id=creds["account_id"].replace("act_", ""),
            level=body.get("level", "campaign"),
            date_preset=body.get("date_preset", "last_30d"),
            fields=body.get("fields"),
            breakdowns=body.get("breakdowns")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Start async report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/async/{run_id}/status")
async def get_report_status(request: Request, run_id: str):
    """GET /api/v1/meta-ads/sdk/reports/async/{run_id}/status"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.check_status(report_run_id=run_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get report status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/async/{run_id}/results")
async def get_report_results(request: Request, run_id: str):
    """GET /api/v1/meta-ads/sdk/reports/async/{run_id}/results"""
    try:
        creds = await get_sdk_credentials(request)
        
        from ..services.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.get_results(report_run_id=run_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get report results error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

        raise HTTPException(status_code=500, detail=str(e))

