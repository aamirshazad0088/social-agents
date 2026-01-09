"""
Meta Ads API - SDK Conversions Endpoints
Handles custom conversions and offline conversions
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Path
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Conversions"])


# Custom Conversions
@router.get("/custom-conversions")
async def get_custom_conversions(request: Request):
    """
    GET /api/v1/meta-ads/sdk/custom-conversions
    
    Get custom conversions for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_custom_conversions import CustomConversionsService
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
    """
    POST /api/v1/meta-ads/sdk/custom-conversions
    
    Create a custom conversion.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        from ....services.meta_ads.sdk_custom_conversions import CustomConversionsService
        service = CustomConversionsService(creds["access_token"])
        
        result = await service.create_custom_conversion(
            account_id=creds["account_id"].replace("act_", ""),
            pixel_id=body.get("pixel_id"),
            name=body.get("name"),
            event_type=body.get("custom_event_type"),
            rule=body.get("rule"),
            default_conversion_value=body.get("default_conversion_value")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Create custom conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Offline Conversions
@router.get("/offline-conversions")
async def get_offline_conversion_datasets(request: Request):
    """
    GET /api/v1/meta-ads/sdk/offline-conversions
    
    Get offline conversion datasets.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_offline_conversions import OfflineConversionsService
        service = OfflineConversionsService(creds["access_token"])
        
        result = await service.get_datasets(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get offline datasets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/offline-conversions/{dataset_id}/events")
async def upload_offline_events(
    request: Request,
    dataset_id: str = Path(...)
):
    """
    POST /api/v1/meta-ads/sdk/offline-conversions/{dataset_id}/events
    
    Upload offline conversion events.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        events = body.get("events", [])
        if not events:
            raise HTTPException(status_code=400, detail="events list is required")
        
        from ....services.meta_ads.sdk_offline_conversions import OfflineConversionsService
        service = OfflineConversionsService(creds["access_token"])
        
        result = await service.upload_events(
            dataset_id=dataset_id,
            events=events
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload offline events error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
