"""
SDK Business Assets Service
Meta Business SDK - Business, BusinessAssetGroup

Uses:
- facebook_business.adobjects.business
- facebook_business.adobjects.businessassetgroup
- Manage business-level assets
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.business import Business
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class BusinessAssetsService:
    """Service for business asset management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_businesses_sync(self) -> Dict[str, Any]:
        """Get all businesses the user has access to."""
        try:
            self._init_api()
            
            from facebook_business.adobjects.user import User
            me = User(fbid="me")
            
            businesses = me.get_businesses(
                fields=[
                    Business.Field.id,
                    Business.Field.name,
                    Business.Field.created_time,
                    Business.Field.primary_page,
                    Business.Field.profile_picture_uri,
                ]
            )
            
            result = []
            for biz in businesses:
                result.append({
                    "id": biz.get("id"),
                    "name": biz.get("name"),
                    "created_time": biz.get("created_time"),
                    "primary_page": biz.get("primary_page", {}).get("id"),
                    "profile_picture_uri": biz.get("profile_picture_uri")
                })
            
            return {"success": True, "businesses": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get businesses error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_businesses(self) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(self._get_businesses_sync)
    
    def _get_owned_ad_accounts_sync(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Get ad accounts owned by a business."""
        try:
            self._init_api()
            business = Business(business_id)
            
            accounts = business.get_owned_ad_accounts(
                fields=[
                    AdAccount.Field.id,
                    AdAccount.Field.name,
                    AdAccount.Field.account_status,
                    AdAccount.Field.amount_spent,
                    AdAccount.Field.currency,
                ]
            )
            
            result = []
            for acc in accounts:
                result.append({
                    "id": acc.get("id"),
                    "name": acc.get("name"),
                    "account_status": acc.get("account_status"),
                    "amount_spent": acc.get("amount_spent"),
                    "currency": acc.get("currency")
                })
            
            return {"success": True, "ad_accounts": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get owned ad accounts error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_owned_ad_accounts(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_owned_ad_accounts_sync,
            business_id
        )
    
    def _get_owned_pages_sync(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Get pages owned by a business."""
        try:
            self._init_api()
            business = Business(business_id)
            
            pages = business.get_owned_pages(
                fields=["id", "name", "category", "fan_count"]
            )
            
            result = []
            for page in pages:
                result.append({
                    "id": page.get("id"),
                    "name": page.get("name"),
                    "category": page.get("category"),
                    "fan_count": page.get("fan_count", 0)
                })
            
            return {"success": True, "pages": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get owned pages error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_owned_pages(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_owned_pages_sync,
            business_id
        )
    
    def _get_owned_pixels_sync(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Get pixels owned by a business."""
        try:
            self._init_api()
            business = Business(business_id)
            
            pixels = business.get_owned_pixels(
                fields=["id", "name", "creation_time", "last_fired_time"]
            )
            
            result = []
            for pixel in pixels:
                result.append({
                    "id": pixel.get("id"),
                    "name": pixel.get("name"),
                    "creation_time": pixel.get("creation_time"),
                    "last_fired_time": pixel.get("last_fired_time")
                })
            
            return {"success": True, "pixels": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get owned pixels error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_owned_pixels(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_owned_pixels_sync,
            business_id
        )
