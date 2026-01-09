"""
Meta Ads API - SDK Ad Library Endpoints
Handles ad library search and competitor analysis
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Ad Library"])


@router.get("/adlibrary/search")
async def search_ad_library(
    request: Request,
    search_terms: str = Query("", description="Search keywords"),
    ad_type: str = Query("ALL", description="Ad type: ALL, POLITICAL_AND_ISSUE_ADS"),
    ad_reached_countries: str = Query("US", description="Comma-separated country codes"),
    search_page_ids: Optional[str] = Query(None, description="Comma-separated page IDs to filter"),
    media_type: Optional[str] = Query(None, description="Filter by media: ALL, IMAGE, VIDEO, MEME, NONE"),
    limit: int = Query(25, le=100)
):
    """
    GET /api/v1/meta-ads/sdk/adlibrary/search
    
    Search the Meta Ad Library.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        countries = [c.strip().upper() for c in ad_reached_countries.split(",") if c.strip()]
        page_ids = [p.strip() for p in search_page_ids.split(",")] if search_page_ids else None
        
        from ....services.meta_ads.sdk_ad_library import AdLibraryService
        service = AdLibraryService(creds["access_token"])
        
        result = await service.search(
            search_terms=search_terms,
            ad_type=ad_type,
            ad_reached_countries=countries,
            search_page_ids=page_ids,
            media_type=media_type,
            limit=limit
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Ad library search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/adlibrary/analyze")
async def analyze_competitor(
    request: Request,
    page_id: str = Query(..., description="Facebook Page ID to analyze"),
    ad_reached_countries: str = Query("US", description="Comma-separated country codes")
):
    """
    GET /api/v1/meta-ads/sdk/adlibrary/analyze
    
    Analyze competitor's ad activity from the Ad Library.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        countries = [c.strip().upper() for c in ad_reached_countries.split(",") if c.strip()]
        
        from ....services.meta_ads.sdk_ad_library import AdLibraryService
        service = AdLibraryService(creds["access_token"])
        
        result = await service.analyze_competitor(
            page_id=page_id,
            ad_reached_countries=countries
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Analyze competitor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
