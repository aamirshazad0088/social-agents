"""
SDK Videos Service
Meta Business SDK - AdVideo

Uses:
- facebook_business.adobjects.advideo
- Upload and manage ad videos
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.advideo import AdVideo
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class VideosService:
    """Service for ad video management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_ad_videos_sync(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all ad videos for an account."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            videos = account.get_ad_videos(
                fields=[
                    AdVideo.Field.id,
                    AdVideo.Field.title,
                    AdVideo.Field.source,
                    AdVideo.Field.created_time,
                    AdVideo.Field.updated_time,
                    AdVideo.Field.length,
                    AdVideo.Field.status,
                    AdVideo.Field.thumbnails,
                ],
                params={"limit": limit}
            )
            
            result = []
            for video in videos:
                thumbnails = video.get("thumbnails", {}).get("data", [])
                thumbnail_url = thumbnails[0].get("uri") if thumbnails else None
                
                result.append({
                    "id": video.get("id"),
                    "title": video.get("title"),
                    "source": video.get("source"),
                    "length": video.get("length"),
                    "created_time": video.get("created_time"),
                    "status": video.get("status", {}).get("video_status"),
                    "thumbnail_url": thumbnail_url
                })
            
            return {"success": True, "videos": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get ad videos error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_ad_videos(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_ad_videos_sync,
            account_id,
            limit
        )
    
    def _upload_video_sync(
        self,
        account_id: str,
        video_path: str,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload a video from local path."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            params = {
                "source": video_path,
            }
            if title:
                params["title"] = title
            
            video = account.create_ad_video(params=params)
            
            return {
                "success": True,
                "video_id": video.get("id"),
                "title": title
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Upload video error: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_video(
        self,
        account_id: str,
        video_path: str,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._upload_video_sync,
            account_id,
            video_path,
            title
        )
    
    def _upload_video_from_url_sync(
        self,
        account_id: str,
        video_url: str,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload a video from URL."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            params = {
                "file_url": video_url,
            }
            if title:
                params["title"] = title
            
            video = account.create_ad_video(params=params)
            
            return {
                "success": True,
                "video_id": video.get("id"),
                "title": title
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Upload video from URL error: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_video_from_url(
        self,
        account_id: str,
        video_url: str,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._upload_video_from_url_sync,
            account_id,
            video_url,
            title
        )
    
    def _get_video_thumbnails_sync(
        self,
        video_id: str
    ) -> Dict[str, Any]:
        """Get video thumbnails."""
        try:
            self._init_api()
            video = AdVideo(video_id)
            
            thumbnails = video.get_thumbnails()
            
            result = []
            for thumb in thumbnails:
                result.append({
                    "id": thumb.get("id"),
                    "uri": thumb.get("uri"),
                    "width": thumb.get("width"),
                    "height": thumb.get("height"),
                    "is_preferred": thumb.get("is_preferred", False)
                })
            
            return {"success": True, "thumbnails": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get video thumbnails error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_video_thumbnails(self, video_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_video_thumbnails_sync,
            video_id
        )


# Video status values
VIDEO_STATUS = {
    "ready": "Video is ready for use",
    "processing": "Video is being processed",
    "error": "Video processing failed"
}
