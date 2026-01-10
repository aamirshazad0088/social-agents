"""
SDK Custom Audiences Service
Meta Business SDK - Custom Audiences & Lookalike Audiences

Uses:
- facebook_business.adobjects.customaudience
- facebook_business.adobjects.adaccount
- Create/manage custom audiences and lookalike audiences
"""
import asyncio
import json
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.customaudience import CustomAudience
from facebook_business.exceptions import FacebookRequestError

from ...config import settings

logger = logging.getLogger(__name__)

# API Version
META_API_VERSION = "v24.0"


class CustomAudiencesService:
    """Service for custom audience management using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        """Initialize the SDK API"""
        from facebook_business.api import FacebookAdsApi
        FacebookAdsApi.init(
            app_id=settings.FACEBOOK_APP_ID,
            app_secret=settings.FACEBOOK_APP_SECRET,
            access_token=self.access_token,
            api_version=META_API_VERSION
        )
    
    def _serialize_sdk_object(self, obj) -> Any:
        """Recursively serialize SDK objects to JSON-safe types"""
        if obj is None:
            return None
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, dict):
            return {k: self._serialize_sdk_object(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [self._serialize_sdk_object(item) for item in obj]
        if hasattr(obj, 'export_all_data'):
            return self._serialize_sdk_object(obj.export_all_data())
        if hasattr(obj, '__dict__'):
            return self._serialize_sdk_object(obj.__dict__)
        try:
            return str(obj)
        except:
            return None
    
    # =========================================================================
    # GET CUSTOM AUDIENCES
    # =========================================================================
    
    def _get_custom_audiences_sync(self, account_id: str) -> List[Dict[str, Any]]:
        """Get all custom audiences for an account."""
        try:
            self._init_api()
            account = AdAccount(f'act_{account_id}')
            audiences = account.get_custom_audiences(fields=[
                'id', 'name', 'subtype', 'description',
                'approximate_count_lower_bound', 'approximate_count_upper_bound',
                'data_source', 'delivery_status', 'time_created', 'time_updated',
                'operation_status', 'retention_days', 'rule', 'lookalike_spec',
                'is_value_based', 'sharing_status', 'permission_for_actions'
            ])
            return [self._serialize_sdk_object(dict(a)) for a in audiences]
        except FacebookRequestError as e:
            logger.error(f"Facebook API error getting custom audiences: {e}")
            raise
    
    async def get_custom_audiences(self, account_id: str) -> List[Dict[str, Any]]:
        """Get all custom audiences for an account (async)."""
        return await asyncio.to_thread(self._get_custom_audiences_sync, account_id)
    
    # =========================================================================
    # CREATE CUSTOM AUDIENCE
    # =========================================================================
    
    def _create_custom_audience_sync(
        self, account_id: str, name: str, subtype: str = None,
        rule: Dict = None, retention_days: int = 30,
        prefill: bool = True, customer_file_source: str = None
    ) -> Dict[str, Any]:
        """
        Create a custom audience.
        
        Per Meta API documentation:
        - ENGAGEMENT audiences (page/IG): NO subtype needed, defined by rule only
        - VIDEO audiences: subtype='VIDEO' required
        - WEBSITE audiences: subtype='WEBSITE' required
        - APP audiences: subtype='APP' required  
        - CUSTOM (customer list): subtype='CUSTOM', customer_file_source required
        - LOOKALIKE: handled by create_lookalike_audience
        """
        try:
            self._init_api()
            account = AdAccount(f'act_{account_id}')
            params = {'name': name}
            
            # Only set subtype for types that require it
            if subtype and subtype.upper() in ['CUSTOM', 'WEBSITE', 'APP', 'VIDEO', 'LOOKALIKE']:
                params['subtype'] = subtype.upper()
            
            if rule:
                params['rule'] = json.dumps(rule) if isinstance(rule, dict) else rule
            
            if retention_days:
                params['retention_days'] = retention_days
            
            if prefill is not None:
                params['prefill'] = prefill
            
            # customer_file_source is ONLY for CUSTOM (customer list) audiences
            if customer_file_source and subtype and subtype.upper() == 'CUSTOM':
                params['customer_file_source'] = customer_file_source
            
            logger.info(f"Creating custom audience with params: {list(params.keys())}")
            result = account.create_custom_audience(params=params)
            return {'success': True, 'audience_id': result.get('id'), 'id': result.get('id')}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error creating custom audience: {e}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error creating custom audience: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_custom_audience(
        self, account_id: str, name: str, subtype: str = None,
        rule: Dict = None, retention_days: int = 30,
        prefill: bool = True, customer_file_source: str = None
    ) -> Dict[str, Any]:
        """Create a custom audience (async)."""
        return await asyncio.to_thread(
            self._create_custom_audience_sync, account_id, name, subtype,
            rule, retention_days, prefill, customer_file_source
        )
    
    # =========================================================================
    # CREATE LOOKALIKE AUDIENCE
    # =========================================================================
    
    def _create_lookalike_audience_sync(
        self, account_id: str, name: str, source_audience_id: str,
        target_countries: List[str], ratio: float = 0.01,
        lookalike_type: str = 'similarity'
    ) -> Dict[str, Any]:
        """Create a lookalike audience."""
        try:
            self._init_api()
            account = AdAccount(f'act_{account_id}')
            params = {
                'name': name,
                'subtype': 'LOOKALIKE',
                'origin_audience_id': source_audience_id,
                'lookalike_spec': {
                    'type': lookalike_type,
                    'country': target_countries[0] if target_countries else 'US',
                    'ratio': ratio
                }
            }
            result = account.create_custom_audience(params=params)
            return {'success': True, 'audience_id': result.get('id'), 'id': result.get('id')}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error creating lookalike audience: {e}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error creating lookalike audience: {e}")
            return {'success': False, 'error': str(e)}
    
    async def create_lookalike_audience(
        self, account_id: str, name: str, source_audience_id: str,
        target_countries: List[str] = None, ratio: float = 0.01,
        lookalike_type: str = 'similarity'
    ) -> Dict[str, Any]:
        """Create a lookalike audience (async)."""
        return await asyncio.to_thread(
            self._create_lookalike_audience_sync, account_id, name,
            source_audience_id, target_countries or ['US'], ratio, lookalike_type
        )
    
    # =========================================================================
    # GET AUDIENCE DETAILS
    # =========================================================================
    
    def _get_audience_details_sync(self, audience_id: str) -> Dict[str, Any]:
        """Get details for a specific audience."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            audience.api_get(fields=[
                'id', 'name', 'subtype', 'description',
                'approximate_count_lower_bound', 'approximate_count_upper_bound',
                'data_source', 'delivery_status', 'time_created', 'time_updated',
                'operation_status', 'retention_days', 'rule', 'lookalike_spec',
                'is_value_based', 'sharing_status', 'permission_for_actions',
                'customer_file_source', 'pixel_id', 'opt_out_link'
            ])
            return {'success': True, 'audience': self._serialize_sdk_object(dict(audience))}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error getting audience details: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_audience_details(self, audience_id: str) -> Dict[str, Any]:
        """Get details for a specific audience (async)."""
        return await asyncio.to_thread(self._get_audience_details_sync, audience_id)
    
    # =========================================================================
    # UPDATE AUDIENCE
    # =========================================================================
    
    def _update_audience_sync(
        self, audience_id: str, name: str = None, description: str = None
    ) -> Dict[str, Any]:
        """Update an audience's name or description."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            params = {}
            if name:
                params['name'] = name
            if description:
                params['description'] = description
            
            if params:
                audience.api_update(params=params)
            
            return {'success': True}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error updating audience: {e}")
            return {'success': False, 'error': str(e)}
    
    async def update_audience(
        self, audience_id: str, name: str = None, description: str = None
    ) -> Dict[str, Any]:
        """Update an audience (async)."""
        return await asyncio.to_thread(
            self._update_audience_sync, audience_id, name, description
        )
    
    # =========================================================================
    # DELETE AUDIENCE
    # =========================================================================
    
    def _delete_custom_audience_sync(self, audience_id: str) -> Dict[str, Any]:
        """Delete a custom audience."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            audience.api_delete()
            return {'success': True}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error deleting audience: {e}")
            return {'success': False, 'error': str(e)}
    
    async def delete_custom_audience(self, audience_id: str) -> Dict[str, Any]:
        """Delete a custom audience (async)."""
        return await asyncio.to_thread(self._delete_custom_audience_sync, audience_id)
    
    # =========================================================================
    # UPLOAD/REMOVE USERS
    # =========================================================================
    
    def _upload_audience_users_sync(
        self, audience_id: str, schema: List[str], data: List[List[str]]
    ) -> Dict[str, Any]:
        """Upload users to a custom audience."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            
            params = {
                'payload': {
                    'schema': schema,
                    'data': data
                }
            }
            
            result = audience.create_user(params=params)
            
            return {
                'success': True,
                'num_received': result.get('num_received', 0),
                'num_invalid_entries': result.get('num_invalid_entries', 0)
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error uploading users: {e}")
            return {'success': False, 'error': str(e)}
    
    async def upload_audience_users(
        self, audience_id: str, schema: List[str], data: List[List[str]]
    ) -> Dict[str, Any]:
        """Upload users to a custom audience (async)."""
        return await asyncio.to_thread(
            self._upload_audience_users_sync, audience_id, schema, data
        )
    
    def _remove_audience_users_sync(
        self, audience_id: str, schema: List[str], data: List[List[str]]
    ) -> Dict[str, Any]:
        """Remove users from a custom audience (GDPR compliance)."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            
            params = {
                'payload': {
                    'schema': schema,
                    'data': data
                }
            }
            
            result = audience.delete_users(params=params)
            
            return {
                'success': True,
                'num_received': result.get('num_received', 0),
                'num_invalid_entries': result.get('num_invalid_entries', 0)
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error removing users: {e}")
            return {'success': False, 'error': str(e)}
    
    async def remove_audience_users(
        self, audience_id: str, schema: List[str], data: List[List[str]]
    ) -> Dict[str, Any]:
        """Remove users from a custom audience (async)."""
        return await asyncio.to_thread(
            self._remove_audience_users_sync, audience_id, schema, data
        )
    
    # =========================================================================
    # SHARE AUDIENCE
    # =========================================================================
    
    def _share_audience_sync(
        self, audience_id: str, recipient_ad_account_id: str
    ) -> Dict[str, Any]:
        """Share an audience with another ad account."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            
            result = audience.create_share_d_account(params={
                'adaccounts': [recipient_ad_account_id]
            })
            
            return {'success': True}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error sharing audience: {e}")
            return {'success': False, 'error': str(e)}
    
    async def share_audience(
        self, audience_id: str, recipient_ad_account_id: str
    ) -> Dict[str, Any]:
        """Share an audience with another ad account (async)."""
        return await asyncio.to_thread(
            self._share_audience_sync, audience_id, recipient_ad_account_id
        )
    
    # =========================================================================
    # GET AUDIENCE SIZE
    # =========================================================================
    
    def _get_audience_size_sync(self, audience_id: str) -> Dict[str, Any]:
        """Get audience size estimation."""
        try:
            self._init_api()
            audience = CustomAudience(fbid=audience_id)
            audience.api_get(fields=[
                'approximate_count_lower_bound', 
                'approximate_count_upper_bound',
                'delivery_status',
                'operation_status'
            ])
            
            return {
                'success': True,
                'approximate_count_lower_bound': audience.get('approximate_count_lower_bound'),
                'approximate_count_upper_bound': audience.get('approximate_count_upper_bound'),
                'delivery_status': audience.get('delivery_status'),
                'operation_status': audience.get('operation_status')
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error getting audience size: {e}")
            return {'success': False, 'error': str(e)}
    
    async def get_audience_size(self, audience_id: str) -> Dict[str, Any]:
        """Get audience size estimation (async)."""
        return await asyncio.to_thread(self._get_audience_size_sync, audience_id)
