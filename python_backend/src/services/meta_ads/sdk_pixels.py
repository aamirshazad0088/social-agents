"""
SDK Pixels Service
Meta Business SDK - AdsPixel

Uses:
- facebook_business.adobjects.adspixel
- Pixel management and diagnostics
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adspixel import AdsPixel
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class PixelsService:
    """Service for pixel management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token, api_version="v24.0")
    
    def _get_pixels_sync(
        self,
        account_id: str
    ) -> Dict[str, Any]:
        """Get all pixels for an account."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            pixels = account.get_ads_pixels(
                fields=[
                    AdsPixel.Field.id,
                    AdsPixel.Field.name,
                    AdsPixel.Field.code,
                    AdsPixel.Field.creation_time,
                    AdsPixel.Field.last_fired_time,
                    AdsPixel.Field.is_created_by_business,
                ]
            )
            
            result = []
            for pixel in pixels:
                result.append({
                    "id": pixel.get("id"),
                    "name": pixel.get("name"),
                    "code": pixel.get("code"),
                    "creation_time": pixel.get("creation_time"),
                    "last_fired_time": pixel.get("last_fired_time"),
                    "is_created_by_business": pixel.get("is_created_by_business")
                })
            
            return {"success": True, "pixels": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get pixels error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_pixels(self, account_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_pixels_sync,
            account_id
        )
    
    def _create_pixel_sync(
        self,
        account_id: str,
        name: str
    ) -> Dict[str, Any]:
        """Create a new pixel."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            pixel = account.create_ads_pixel(
                params={"name": name}
            )
            
            return {
                "success": True,
                "pixel_id": pixel.get("id"),
                "name": name
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Create pixel error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_pixel(
        self,
        account_id: str,
        name: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._create_pixel_sync,
            account_id,
            name
        )
    
    def _get_pixel_stats_sync(
        self,
        pixel_id: str
    ) -> Dict[str, Any]:
        """Get pixel statistics (v24.0)."""
        try:
            self._init_api()
            pixel = AdsPixel(pixel_id)
            
            stats = pixel.get_stats(
                fields=["data", "aggregation", "timestamp"]
            )
            
            event_stats = []
            # Meta standard response structure for v24.0 stats
            for stat in stats:
                data = stat.get("data", [])
                for event in data:
                    event_stats.append({
                        "event": event.get("event"),
                        "count": event.get("count", 0),
                        "value": event.get("value", 0),
                        "timestamp": event.get("timestamp")
                    })
            
            return {"success": True, "stats": event_stats}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get pixel stats error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_pixel_stats(self, pixel_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_pixel_stats_sync,
            pixel_id
        )
    
    def _get_pixel_events_sync(
        self,
        pixel_id: str
    ) -> Dict[str, Any]:
        """Get recent pixel events."""
        try:
            self._init_api()
            pixel = AdsPixel(pixel_id)
            
            # Get shared accounts info
            pixel_data = pixel.api_get(
                fields=[
                    AdsPixel.Field.id,
                    AdsPixel.Field.name,
                    AdsPixel.Field.last_fired_time,
                ]
            )
            
            return {
                "success": True,
                "pixel_id": pixel_data.get("id"),
                "name": pixel_data.get("name"),
                "last_fired_time": pixel_data.get("last_fired_time")
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get pixel events error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_pixel_events(self, pixel_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_pixel_events_sync,
            pixel_id
        )


# Standard pixel events
PIXEL_EVENTS = [
    "PageView",
    "ViewContent",
    "Search",
    "AddToCart",
    "AddToWishlist",
    "InitiateCheckout",
    "AddPaymentInfo",
    "Purchase",
    "Lead",
    "CompleteRegistration",
    "Contact",
    "CustomizeProduct",
    "Donate",
    "FindLocation",
    "Schedule",
    "StartTrial",
    "SubmitApplication",
    "Subscribe"
]
