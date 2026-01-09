"""
SDK Saved Audiences Service
Meta Business SDK - SavedAudience

Uses:
- facebook_business.adobjects.savedaudience
- Reusable targeting templates
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.savedaudience import SavedAudience
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class SavedAudiencesService:
    """Service for saved audience management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_saved_audiences_sync(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all saved audiences for an account."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            audiences = account.get_saved_audiences(
                fields=[
                    SavedAudience.Field.id,
                    SavedAudience.Field.name,
                    SavedAudience.Field.description,
                    SavedAudience.Field.targeting,
                    SavedAudience.Field.approximate_count,
                    SavedAudience.Field.run_status,
                ],
                params={"limit": limit}
            )
            
            result = []
            for aud in audiences:
                result.append({
                    "id": aud.get("id"),
                    "name": aud.get("name"),
                    "description": aud.get("description"),
                    "approximate_count": aud.get("approximate_count"),
                    "run_status": aud.get("run_status"),
                    "targeting": aud.get("targeting", {})
                })
            
            return {"success": True, "audiences": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get saved audiences error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_saved_audiences(
        self,
        account_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_saved_audiences_sync,
            account_id,
            limit
        )
    
    def _create_saved_audience_sync(
        self,
        account_id: str,
        name: str,
        targeting: Dict[str, Any],
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new saved audience."""
        try:
            self._init_api()
            account = AdAccount(f"act_{account_id}")
            
            params = {
                "name": name,
                "targeting": targeting,
            }
            if description:
                params["description"] = description
            
            audience = account.create_saved_audience(params=params)
            
            return {
                "success": True,
                "audience_id": audience.get("id"),
                "name": name
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Create saved audience error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_saved_audience(
        self,
        account_id: str,
        name: str,
        targeting: Dict[str, Any],
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._create_saved_audience_sync,
            account_id,
            name,
            targeting,
            description
        )
    
    def _delete_saved_audience_sync(
        self,
        audience_id: str
    ) -> Dict[str, Any]:
        """Delete a saved audience."""
        try:
            self._init_api()
            audience = SavedAudience(audience_id)
            audience.api_delete()
            
            return {"success": True}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Delete saved audience error: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_saved_audience(self, audience_id: str) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._delete_saved_audience_sync,
            audience_id
        )
