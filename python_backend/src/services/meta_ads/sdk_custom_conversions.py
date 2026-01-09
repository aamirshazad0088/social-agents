"""
SDK Custom Conversions Service
Meta Business SDK - CustomConversion

Uses:
- facebook_business.adobjects.customconversion
- Track specific conversion events
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.customconversion import CustomConversion
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class CustomConversionsService:
    """Service for custom conversion management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_custom_conversions_sync(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all custom conversions for an account."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            conversions = account.get_custom_conversions(
                fields=[
                    CustomConversion.Field.id,
                    CustomConversion.Field.name,
                    CustomConversion.Field.description,
                    CustomConversion.Field.pixel,
                    CustomConversion.Field.rule,
                    CustomConversion.Field.default_conversion_value,
                    CustomConversion.Field.is_archived,
                    CustomConversion.Field.custom_event_type,
                ],
                params={"limit": limit}
            )
            
            result = []
            for conv in conversions:
                result.append({
                    "id": conv.get("id"),
                    "name": conv.get("name"),
                    "description": conv.get("description"),
                    "pixel_id": conv.get("pixel", {}).get("id"),
                    "rule": conv.get("rule"),
                    "default_conversion_value": conv.get("default_conversion_value"),
                    "is_archived": conv.get("is_archived", False),
                    "custom_event_type": conv.get("custom_event_type")
                })
            
            return {"success": True, "conversions": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get custom conversions error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_custom_conversions(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_custom_conversions_sync,
            account_id,
            limit
        )
    
    def _create_custom_conversion_sync(
        self,
        account_id: str,
        name: str,
        pixel_id: str,
        event_source_type: str = "PIXEL",
        custom_event_type: str = "OTHER",
        rule: Optional[str] = None,
        default_conversion_value: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Create a new custom conversion.
        
        Args:
            account_id: Ad account ID
            name: Conversion name
            pixel_id: Pixel to attach to
            event_source_type: PIXEL, APP, or OFFLINE
            custom_event_type: PURCHASE, LEAD, etc.
            rule: JSON rule for URL/event filtering
            default_conversion_value: Default value for conversion
        """
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            params = {
                "name": name,
                "pixel": pixel_id,
                "event_source_type": event_source_type,
                "custom_event_type": custom_event_type,
            }
            
            if rule:
                params["rule"] = rule
            if default_conversion_value:
                params["default_conversion_value"] = default_conversion_value
            
            conversion = account.create_custom_conversion(params=params)
            
            return {
                "success": True,
                "conversion_id": conversion.get("id"),
                "name": name
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Create custom conversion error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_custom_conversion(
        self,
        account_id: str,
        name: str,
        pixel_id: str,
        event_source_type: str = "PIXEL",
        custom_event_type: str = "OTHER",
        rule: Optional[str] = None,
        default_conversion_value: Optional[float] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._create_custom_conversion_sync,
            account_id,
            name,
            pixel_id,
            event_source_type,
            custom_event_type,
            rule,
            default_conversion_value
        )
    
    def _delete_custom_conversion_sync(
        self,
        conversion_id: str
    ) -> Dict[str, Any]:
        """Delete (archive) a custom conversion."""
        try:
            self._init_api()
            conversion = CustomConversion(conversion_id)
            conversion.api_delete()
            
            return {"success": True}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Delete custom conversion error: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_custom_conversion(
        self,
        conversion_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._delete_custom_conversion_sync,
            conversion_id
        )


# Custom event types
CUSTOM_EVENT_TYPES = [
    "PURCHASE",
    "LEAD",
    "COMPLETE_REGISTRATION",
    "ADD_TO_CART",
    "ADD_TO_WISHLIST",
    "VIEW_CONTENT",
    "SEARCH",
    "INITIATE_CHECKOUT",
    "ADD_PAYMENT_INFO",
    "CONTACT",
    "CUSTOMIZE_PRODUCT",
    "DONATE",
    "FIND_LOCATION",
    "SCHEDULE",
    "START_TRIAL",
    "SUBMIT_APPLICATION",
    "SUBSCRIBE",
    "OTHER"
]
