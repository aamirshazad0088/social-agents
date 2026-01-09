"""
Meta Ads API - SDK Pixels Endpoints
Handles pixel operations via SDK
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Pixels"])


@router.get("/pixels")
async def get_pixels(request: Request):
    """
    GET /api/v1/meta-ads/sdk/pixels
    
    Get pixels for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_pixels import PixelsService
        service = PixelsService(creds["access_token"])
        
        result = await service.get_pixels(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get pixels error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pixels/{pixel_id}/stats")
async def get_pixel_stats(
    request: Request,
    pixel_id: str = Path(...),
    date_preset: str = Query("last_7d")
):
    """
    GET /api/v1/meta-ads/sdk/pixels/{pixel_id}/stats
    
    Get statistics for a pixel.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_pixels import PixelsService
        service = PixelsService(creds["access_token"])
        
        result = await service.get_pixel_stats(
            pixel_id=pixel_id,
            date_preset=date_preset
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get pixel stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
