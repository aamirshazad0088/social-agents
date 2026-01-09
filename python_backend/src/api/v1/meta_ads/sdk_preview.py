"""
Meta Ads API - SDK Ad Preview Endpoints
Handles ad previews and format information
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Ad Preview"])


@router.get("/preview/formats")
async def get_preview_formats(request: Request):
    """
    GET /api/v1/meta-ads/sdk/preview/formats
    
    Get available ad preview formats.
    """
    formats = [
        {"value": "DESKTOP_FEED_STANDARD", "label": "Desktop News Feed"},
        {"value": "MOBILE_FEED_STANDARD", "label": "Mobile News Feed"},
        {"value": "MOBILE_FEED_BASIC", "label": "Mobile News Feed (Basic)"},
        {"value": "MOBILE_INTERSTITIAL", "label": "Mobile Interstitial"},
        {"value": "MOBILE_BANNER", "label": "Mobile Banner"},
        {"value": "MOBILE_MEDIUM_RECTANGLE", "label": "Mobile Medium Rectangle"},
        {"value": "MOBILE_NATIVE", "label": "Mobile Native"},
        {"value": "INSTAGRAM_STANDARD", "label": "Instagram Feed"},
        {"value": "INSTAGRAM_STORY", "label": "Instagram Stories"},
        {"value": "INSTAGRAM_EXPLORE_GRID_HOME", "label": "Instagram Explore"},
        {"value": "MARKETPLACE_MOBILE", "label": "Marketplace Mobile"},
        {"value": "RIGHT_COLUMN_STANDARD", "label": "Right Column"},
        {"value": "AUDIENCE_NETWORK_INSTREAM_VIDEO", "label": "Audience Network In-Stream"},
        {"value": "AUDIENCE_NETWORK_REWARDED_VIDEO", "label": "Audience Network Rewarded"},
        {"value": "MESSENGER_MOBILE_INBOX_MEDIA", "label": "Messenger Inbox"},
        {"value": "MESSENGER_MOBILE_STORY_MEDIA", "label": "Messenger Stories"},
        {"value": "FACEBOOK_REELS_MOBILE", "label": "Facebook Reels"},
        {"value": "INSTAGRAM_REELS", "label": "Instagram Reels"}
    ]
    
    return JSONResponse(content={"success": True, "formats": formats})


@router.get("/preview/{ad_id}")
async def get_ad_preview(
    request: Request,
    ad_id: str = Path(...),
    ad_format: str = Query("DESKTOP_FEED_STANDARD")
):
    """
    GET /api/v1/meta-ads/sdk/preview/{ad_id}
    
    Get preview for an existing ad.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_ad_preview import AdPreviewService
        service = AdPreviewService(creds["access_token"])
        
        result = await service.get_ad_preview(
            ad_id=ad_id,
            ad_format=ad_format
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get ad preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview/creative")
async def preview_creative(request: Request):
    """
    POST /api/v1/meta-ads/sdk/preview/creative
    
    Generate preview for ad creative specs without creating an ad.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        creative = body.get("creative", {})
        ad_format = body.get("ad_format", "DESKTOP_FEED_STANDARD")
        
        from ....services.meta_ads.sdk_ad_preview import AdPreviewService
        service = AdPreviewService(creds["access_token"])
        
        result = await service.generate_preview(
            account_id=creds["account_id"].replace("act_", ""),
            creative=creative,
            ad_format=ad_format
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Generate preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
