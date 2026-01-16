"""
Meta Ads API - SDK Targeting Endpoints
Handles targeting search and browse
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Targeting"])


@router.get("/targeting/search")
async def search_targeting(
    request: Request,
    q: str = Query(..., min_length=1),
    type: str = Query("adinterest", description="Type: adinterest, adinterestsuggestion, adeducationschool, adworkemployer, etc."),
    limit: int = Query(25, le=50)
):
    """
    GET /api/v1/meta-ads/sdk/targeting/search
    
    Search for targeting options.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.search_targeting(
            query=q,
            target_type=type,
            limit=limit
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Targeting search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/browse")
async def browse_targeting(
    request: Request,
    class_: str = Query("interests", alias="class", description="Class: interests, behaviors, demographics, life_events")
):
    """
    GET /api/v1/meta-ads/sdk/targeting/browse
    
    Browse targeting categories.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.browse_targeting(targeting_class=class_)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Targeting browse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/targeting/geolocations")
async def search_geolocations(
    request: Request,
    q: str = Query(..., min_length=1),
    location_types: str = Query("country,region,city", description="Comma-separated: country, region, city, zip, geo_market, electoral_district"),
    limit: int = Query(25, le=100)
):
    """
    GET /api/v1/meta-ads/sdk/targeting/geolocations
    
    Search for geographic locations.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_targeting import TargetingService
        service = TargetingService(creds["access_token"])
        
        result = await service.search_geolocations(
            query=q,
            location_types=location_types.split(","),
            limit=limit
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Geolocation search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
