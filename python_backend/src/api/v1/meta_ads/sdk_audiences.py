"""
Meta Ads API - SDK Saved Audiences Endpoints
Handles saved audience operations
"""
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Saved Audiences"])


@router.get("/audiences")
async def get_saved_audiences(request: Request):
    """
    GET /api/v1/meta-ads/sdk/audiences
    
    Get saved audiences.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_saved_audiences import SavedAudienceService
        service = SavedAudienceService(creds["access_token"])
        
        result = await service.get_saved_audiences(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get saved audiences error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audiences")
async def create_saved_audience(request: Request):
    """
    POST /api/v1/meta-ads/sdk/audiences
    
    Create a saved audience.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        from ....services.meta_ads.sdk_saved_audiences import SavedAudienceService
        service = SavedAudienceService(creds["access_token"])
        
        result = await service.create_saved_audience(
            account_id=creds["account_id"].replace("act_", ""),
            name=body.get("name"),
            targeting=body.get("targeting", {})
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Create saved audience error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
