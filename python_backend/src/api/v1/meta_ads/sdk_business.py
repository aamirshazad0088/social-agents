"""
Meta Ads API - SDK Business Assets Endpoints
Handles business asset operations
"""
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Business Assets"])


@router.get("/businesses")
async def get_businesses(request: Request):
    """
    GET /api/v1/meta-ads/sdk/businesses
    
    Get businesses the user has access to.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_business_assets import BusinessAssetsService
        service = BusinessAssetsService(creds["access_token"])
        
        result = await service.get_businesses()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get businesses error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ad-accounts")
async def get_ad_accounts(request: Request):
    """
    GET /api/v1/meta-ads/sdk/ad-accounts
    
    Get ad accounts the user has access to.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_business_assets import BusinessAssetsService
        service = BusinessAssetsService(creds["access_token"])
        
        result = await service.get_ad_accounts()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get ad accounts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
