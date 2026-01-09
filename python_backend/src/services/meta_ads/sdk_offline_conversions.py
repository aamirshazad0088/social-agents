"""
SDK Offline Conversions Service
Meta Business SDK - OfflineConversionDataSet

Uses:
- facebook_business.adobjects.offlineconversiondataset
- Upload offline conversion events
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from facebook_business.adobjects.business import Business
from facebook_business.adobjects.offlineconversiondataset import OfflineConversionDataSet
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class OfflineConversionsService:
    """Service for offline conversion management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(access_token=self.access_token)
    
    def _get_offline_datasets_sync(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Get all offline conversion datasets for a business."""
        try:
            self._init_api()
            business = Business(business_id)
            
            datasets = business.get_owned_offline_conversion_data_sets(
                fields=[
                    OfflineConversionDataSet.Field.id,
                    OfflineConversionDataSet.Field.name,
                    OfflineConversionDataSet.Field.description,
                    OfflineConversionDataSet.Field.creation_time,
                    OfflineConversionDataSet.Field.event_stats,
                    OfflineConversionDataSet.Field.is_mta_use,
                ]
            )
            
            result = []
            for ds in datasets:
                result.append({
                    "id": ds.get("id"),
                    "name": ds.get("name"),
                    "description": ds.get("description"),
                    "creation_time": ds.get("creation_time"),
                    "event_stats": ds.get("event_stats"),
                    "is_mta_use": ds.get("is_mta_use", False)
                })
            
            return {"success": True, "datasets": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get offline datasets error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_offline_datasets(
        self,
        business_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_offline_datasets_sync,
            business_id
        )
    
    def _create_offline_dataset_sync(
        self,
        business_id: str,
        name: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new offline conversion dataset."""
        try:
            self._init_api()
            business = Business(business_id)
            
            params = {"name": name}
            if description:
                params["description"] = description
            
            dataset = business.create_owned_offline_conversion_data_set(
                params=params
            )
            
            return {
                "success": True,
                "dataset_id": dataset.get("id"),
                "name": name
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Create offline dataset error: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_offline_dataset(
        self,
        business_id: str,
        name: str,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._create_offline_dataset_sync,
            business_id,
            name,
            description
        )
    
    def _upload_offline_events_sync(
        self,
        dataset_id: str,
        events: List[Dict[str, Any]],
        upload_tag: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload offline conversion events.
        
        events format:
        [
            {
                "match_keys": {
                    "email": "hashed_email",
                    "phone": "hashed_phone"
                },
                "event_name": "Purchase",
                "event_time": 1234567890,
                "value": 100.00,
                "currency": "USD"
            }
        ]
        """
        try:
            self._init_api()
            dataset = OfflineConversionDataSet(dataset_id)
            
            params = {
                "data": events,
            }
            if upload_tag:
                params["upload_tag"] = upload_tag
            else:
                params["upload_tag"] = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            result = dataset.create_event(params=params)
            
            return {
                "success": True,
                "num_processed_entries": result.get("num_processed_entries", 0),
                "upload_session_id": result.get("upload_session_id")
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Upload offline events error: {e}")
            return {"success": False, "error": str(e)}
    
    async def upload_offline_events(
        self,
        dataset_id: str,
        events: List[Dict[str, Any]],
        upload_tag: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._upload_offline_events_sync,
            dataset_id,
            events,
            upload_tag
        )
    
    def _get_upload_stats_sync(
        self,
        dataset_id: str
    ) -> Dict[str, Any]:
        """Get upload statistics for a dataset."""
        try:
            self._init_api()
            dataset = OfflineConversionDataSet(dataset_id)
            
            uploads = dataset.get_uploads(
                fields=["id", "upload_tag", "progress", "first_upload_time", "last_upload_time"]
            )
            
            result = []
            for upload in uploads:
                result.append({
                    "id": upload.get("id"),
                    "upload_tag": upload.get("upload_tag"),
                    "progress": upload.get("progress"),
                    "first_upload_time": upload.get("first_upload_time"),
                    "last_upload_time": upload.get("last_upload_time")
                })
            
            return {"success": True, "uploads": result}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Get upload stats error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_upload_stats(
        self,
        dataset_id: str
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_upload_stats_sync,
            dataset_id
        )


# Offline event types
OFFLINE_EVENT_TYPES = [
    "Purchase",
    "Lead",
    "ViewContent",
    "AddToCart",
    "InitiateCheckout",
    "CompleteRegistration",
    "Other"
]
