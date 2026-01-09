"""
Meta Ads API - Pixel Management Endpoints
Handles Facebook Pixel management
"""
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Pixels"])


@router.get("/pixels")
async def list_pixels(request: Request):
    """
    GET /api/v1/meta-ads/pixels
    
    List all pixels associated with the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_pixels(
            account_id=credentials["account_id"]
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "pixels": result.get("pixels", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing pixels: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pixels/{pixel_id}")
async def get_pixel_details(request: Request, pixel_id: str = Path(...)):
    """
    GET /api/v1/meta-ads/pixels/{pixel_id}
    
    Get details for a specific pixel.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_pixel_details(pixel_id=pixel_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "pixel": result.get("pixel")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pixel details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pixels/{pixel_id}/users")
async def list_pixel_users(request: Request, pixel_id: str = Path(...)):
    """
    GET /api/v1/meta-ads/pixels/{pixel_id}/users
    
    List users who have access to the pixel.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_pixel_users(pixel_id=pixel_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "users": result.get("users", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing pixel users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/pixels/{pixel_id}")
async def update_pixel(request: Request, pixel_id: str = Path(...)):
    """
    PATCH /api/v1/meta-ads/pixels/{pixel_id}
    
    Update pixel settings.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        body = await request.json()
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.update_pixel(
            pixel_id=pixel_id,
            updates=body
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={"success": True})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pixel: {e}")
        raise HTTPException(status_code=500, detail=str(e))
