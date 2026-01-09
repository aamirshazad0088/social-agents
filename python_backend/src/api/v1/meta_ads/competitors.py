"""
Meta Ads API - Competitor Analysis Endpoints
Handles competitor search, trends, and watchlist
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Request, HTTPException, Query, Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ._helpers import get_user_context, get_verified_credentials
from ....services.supabase_service import get_supabase_admin_client
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Competitors"])


class AddToWatchlistRequest(BaseModel):
    """Request body for adding competitor to watchlist"""
    page_id: str
    page_name: str
    notes: Optional[str] = None


@router.get("/competitors/search")
async def search_competitors(
    request: Request,
    query: str = Query(..., min_length=2),
    limit: int = Query(20, le=50)
):
    """
    GET /api/v1/meta-ads/competitors/search
    
    Search for competitor Facebook pages by name.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.search_pages(
            query=query,
            limit=limit
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "pages": result.get("pages", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching competitors: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competitors/trends")
async def get_competitor_trends(
    request: Request,
    page_ids: str = Query(..., description="Comma-separated page IDs")
):
    """
    GET /api/v1/meta-ads/competitors/trends
    
    Get ad activity trends for specified competitor pages.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        page_id_list = [pid.strip() for pid in page_ids.split(",") if pid.strip()]
        
        if not page_id_list:
            raise HTTPException(status_code=400, detail="At least one page_id is required")
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_competitor_ad_trends(page_ids=page_id_list)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "trends": result.get("trends", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting competitor trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/competitors/watchlist")
async def get_competitor_watchlist(request: Request):
    """
    GET /api/v1/meta-ads/competitors/watchlist
    
    Get saved competitor watchlist.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        
        client = get_supabase_admin_client()
        result = client.table("competitor_watchlist").select("*").eq(
            "workspace_id", workspace_id
        ).order("created_at", desc=True).execute()
        
        return JSONResponse(content={
            "success": True,
            "watchlist": result.data or []
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting competitor watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/competitors/watchlist")
async def add_to_watchlist(request: Request, body: AddToWatchlistRequest):
    """
    POST /api/v1/meta-ads/competitors/watchlist
    
    Add a competitor page to watchlist.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        
        client = get_supabase_admin_client()
        
        # Check if already in watchlist
        existing = client.table("competitor_watchlist").select("id").eq(
            "workspace_id", workspace_id
        ).eq("page_id", body.page_id).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Competitor already in watchlist")
        
        result = client.table("competitor_watchlist").insert({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "page_id": body.page_id,
            "page_name": body.page_name,
            "notes": body.notes
        }).execute()
        
        return JSONResponse(content={
            "success": True,
            "entry": result.data[0] if result.data else None
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/competitors/watchlist/{entry_id}")
async def remove_from_watchlist(request: Request, entry_id: str = Path(...)):
    """
    DELETE /api/v1/meta-ads/competitors/watchlist/{entry_id}
    
    Remove a competitor from watchlist.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        
        client = get_supabase_admin_client()
        client.table("competitor_watchlist").delete().eq(
            "id", entry_id
        ).eq("workspace_id", workspace_id).execute()
        
        return JSONResponse(content={"success": True})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from watchlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))
