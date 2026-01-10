"""
Meta Ads API - Pages Endpoints
Handles Facebook/Instagram Page operations
"""
import logging

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Pages"])


@router.get("/pages")
async def list_pages(request: Request):
    """
    GET /api/v1/meta-ads/pages
    
    List Facebook pages accessible to the user
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        pages = await client.get_user_pages()
        
        return JSONResponse(content={"pages": pages or []})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pages/{page_id}")
async def get_page_details(request: Request, page_id: str):
    """
    GET /api/v1/meta-ads/pages/{page_id}
    
    Get details for a specific page
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        page = await client.get_page_details(page_id)
        
        return JSONResponse(content={"page": page})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching page details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
