"""
SDK Ad Preview Service
Meta Business SDK - AdPreview

Uses:
- facebook_business.adobjects.adpreview
- Generate ad previews before publishing
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


# Preview formats available
PREVIEW_FORMATS = [
    "DESKTOP_FEED_STANDARD",
    "MOBILE_FEED_STANDARD",
    "INSTAGRAM_STANDARD",
    "INSTAGRAM_STORY",
    "FACEBOOK_STORY_MOBILE",
    "MESSENGER_MOBILE_INBOX_MEDIA",
    "RIGHT_COLUMN_STANDARD",
    "MARKETPLACE_MOBILE",
    "AUDIENCE_NETWORK_OUTSTREAM_VIDEO",
]


class AdPreviewService:
    """Service for generating ad previews using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_ad_preview_sync(
        self,
        ad_id: str,
        ad_format: str = "DESKTOP_FEED_STANDARD"
    ) -> Dict[str, Any]:
        """
        Generate preview for an existing ad.
        
        Args:
            ad_id: The ad ID to preview
            ad_format: Preview format (DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, etc.)
        """
        try:
            self._init_api()
            ad = Ad(ad_id)
            
            previews = ad.get_previews(
                params={
                    "ad_format": ad_format,
                }
            )
            
            result = []
            for preview in previews:
                result.append({
                    "body": preview.get("body"),
                })
            
            return {
                "success": True,
                "previews": result,
                "format": ad_format
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Ad preview error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_ad_preview(
        self,
        ad_id: str,
        ad_format: str = "DESKTOP_FEED_STANDARD"
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_ad_preview_sync,
            ad_id,
            ad_format
        )
    
    def _get_creative_preview_sync(
        self,
        account_id: str,
        creative_spec: Dict[str, Any],
        ad_format: str = "DESKTOP_FEED_STANDARD"
    ) -> Dict[str, Any]:
        """
        Generate preview from creative specification (before creating ad).
        
        Args:
            account_id: Ad account ID
            creative_spec: Creative specification dict
            ad_format: Preview format
        """
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            previews = account.get_generate_previews(
                params={
                    "creative": creative_spec,
                    "ad_format": ad_format,
                }
            )
            
            result = []
            for preview in previews:
                result.append({
                    "body": preview.get("body"),
                })
            
            return {
                "success": True,
                "previews": result,
                "format": ad_format
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Creative preview error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_creative_preview(
        self,
        account_id: str,
        creative_spec: Dict[str, Any],
        ad_format: str = "DESKTOP_FEED_STANDARD"
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_creative_preview_sync,
            account_id,
            creative_spec,
            ad_format
        )
    
    def _get_all_format_previews_sync(
        self,
        ad_id: str
    ) -> Dict[str, Any]:
        """Generate previews for all available formats."""
        try:
            self._init_api()
            ad = Ad(ad_id)
            
            all_previews = {}
            for fmt in PREVIEW_FORMATS:
                try:
                    previews = ad.get_previews(params={"ad_format": fmt})
                    if previews:
                        all_previews[fmt] = previews[0].get("body", "")
                except Exception:
                    # Some formats may not be available for this ad
                    pass
            
            return {
                "success": True,
                "previews": all_previews,
                "formats_available": list(all_previews.keys())
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"All format previews error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_all_format_previews(self, ad_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_all_format_previews_sync,
            ad_id
        )
