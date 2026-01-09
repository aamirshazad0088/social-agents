"""
Meta Ads API - SDK Videos Endpoints
Handles video operations
"""
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Videos"])


@router.get("/videos")
async def get_videos(request: Request):
    """
    GET /api/v1/meta-ads/sdk/videos
    
    Get videos from the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_videos import VideosService
        service = VideosService(creds["access_token"])
        
        result = await service.get_videos(
            account_id=creds["account_id"].replace("act_", "")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get videos error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/videos/upload")
async def upload_video_from_url(request: Request):
    """
    POST /api/v1/meta-ads/sdk/videos/upload
    
    Upload a video from URL.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        video_url = body.get("video_url")
        title = body.get("title", "Ad Video")
        
        if not video_url:
            raise HTTPException(status_code=400, detail="video_url is required")
        
        from ....services.meta_ads.sdk_videos import VideosService
        service = VideosService(creds["access_token"])
        
        result = await service.upload_video_from_url(
            account_id=creds["account_id"].replace("act_", ""),
            video_url=video_url,
            name=title
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload video error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
