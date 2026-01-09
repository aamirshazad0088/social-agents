"""
Meta Ads API - Creative Library Endpoints
Handles creative library and asset uploads
"""
import logging

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_ads_service import get_meta_ads_service
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Creative"])


@router.get("/creative-library")
async def get_creative_library(request: Request):
    """
    GET /api/v1/meta-ads/creative-library
    
    List creatives from the ad account's creative library.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_ad_creatives(
            account_id=credentials["account_id"]
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "creatives": result.get("creatives", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching creative library: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/creative-library/upload")
async def upload_creative(
    request: Request,
    file: UploadFile = File(...)
):
    """
    POST /api/v1/meta-ads/creative-library/upload
    
    Upload an image or video to the creative library.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        service = get_meta_ads_service()
        
        # Read file content
        file_content = await file.read()
        
        # Determine file type and upload accordingly
        content_type = file.content_type or ""
        
        if "video" in content_type:
            # Upload as video
            result = await service.upload_ad_video_bytes(
                account_id=credentials["account_id"],
                access_token=credentials["access_token"],
                file_bytes=file_content,
                filename=file.filename
            )
        else:
            # Upload as image
            result = await service.upload_ad_image_bytes(
                account_id=credentials["account_id"],
                access_token=credentials["access_token"],
                file_bytes=file_content,
                filename=file.filename
            )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading creative: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ad-library/search")
async def search_ad_library(
    request: Request,
    search_terms: str = "",
    ad_type: str = "ALL",
    countries: str = "US",
    limit: int = 25
):
    """
    GET /api/v1/meta-ads/ad-library/search
    
    Search the Facebook Ad Library to analyze competitor ads.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.search_ad_library(
            search_terms=search_terms,
            ad_type=ad_type.upper() if ad_type else "ALL",
            countries=countries.upper().split(",") if countries else ["US"],
            limit=min(limit, 100)
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "ads": result.get("ads", []),
            "paging": result.get("paging")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching ad library: {e}")
        raise HTTPException(status_code=500, detail=str(e))
