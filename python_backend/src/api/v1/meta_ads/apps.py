"""
Meta Ads API - Apps Endpoints
Handles Facebook App operations for ads
"""
import logging

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Apps"])


@router.get("/apps")
async def list_apps(request: Request):
    """
    GET /api/v1/meta-ads/apps
    
    List apps accessible to the user (for app promotion campaigns)
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        apps = await client.get_user_apps()
        
        return JSONResponse(content={"apps": apps or []})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching apps: {e}")
        raise HTTPException(status_code=500, detail=str(e))
