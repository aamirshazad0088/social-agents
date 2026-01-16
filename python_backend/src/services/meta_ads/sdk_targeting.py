"""
SDK Targeting Options Service
Meta Business SDK - Targeting

Uses:
- facebook_business.adobjects.targeting
- facebook_business.adobjects.targetingsearch
- Browse and search targeting options
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.targetingsearch import TargetingSearch
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class TargetingService:
    """Service for targeting options using Meta SDK."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        from ...config import settings
        
        # Initialize with app credentials for appsecret_proof support
        FacebookAdsApi.init(
            app_id=settings.FACEBOOK_APP_ID,
            app_secret=settings.FACEBOOK_APP_SECRET,
            access_token=self.access_token, 
            api_version="v24.0"
        )
    
    def _search_targeting_sync(
        self,
        query: str,
        target_type: str = "adinterest",
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Search for targeting options.
        
        target_type options:
        - adinterest: Interests
        - adgeolocation: Locations
        - adeducationschool: Schools
        - adworkemployer: Employers
        - adworkposition: Job titles
        - adlocale: Languages
        """
        try:
            self._init_api()
            
            results = TargetingSearch.search(
                params={
                    "q": query,
                    "type": target_type,
                    "limit": limit
                }
            )
            
            options = []
            for item in results:
                options.append({
                    # Core fields
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "type": item.get("type"),
                    "key": item.get("key"),  # Used for geo locations
                    
                    # Audience size metrics
                    "audience_size": item.get("audience_size"),
                    "audience_size_lower_bound": item.get("audience_size_lower_bound"),
                    "audience_size_upper_bound": item.get("audience_size_upper_bound"),
                    
                    # Descriptive fields
                    "path": item.get("path", []),
                    "description": item.get("description"),
                    "topic": item.get("topic"),
                    "disambiguation_category": item.get("disambiguation_category"),
                    
                    # Targeting validity
                    "valid_for_targeting": item.get("valid_for_targeting", True),
                    "country_access": item.get("country_access"),
                    
                    # Device/Platform specific
                    "mobile_platform": item.get("mobile_platform"),
                    "supports_city": item.get("supports_city"),
                    "supports_region": item.get("supports_region"),
                    "country_code": item.get("country_code"),
                })
            
            return {"success": True, "options": options}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Targeting search error: {e}")
            return {"success": False, "error": str(e)}
    
    async def search_targeting(
        self,
        query: str,
        target_type: str = "adinterest",
        limit: int = 25
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._search_targeting_sync,
            query,
            target_type,
            limit
        )
    
    def _browse_targeting_sync(
        self,
        target_type: str = "adinterest",
        targeting_class: str = "interests"
    ) -> Dict[str, Any]:
        """
        Browse targeting categories using Meta's Targeting Search API.
        
        Per Meta API documentation:
        - Use 'adTargetingCategory' type for browsing categories
        - Supported classes: behaviors, demographics, interests, life_events,
          industries, income, family_statuses, user_os, user_device
        
        targeting_class options:
        - interests
        - behaviors
        - demographics
        - life_events
        - industries
        """
        try:
            self._init_api()
            
            # Map to correct API type for browsing
            # adTargetingCategory is the correct type for browsing categories
            # adinterest is for searching specific interests with a query
            browse_type = "adTargetingCategory"
            
            results = TargetingSearch.search(
                params={
                    "type": browse_type,
                    "class": targeting_class
                }
            )
            
            categories = []
            for item in results:
                categories.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "audience_size": item.get("audience_size"),
                    "audience_size_lower_bound": item.get("audience_size_lower_bound"),
                    "audience_size_upper_bound": item.get("audience_size_upper_bound"),
                    "path": item.get("path", []),
                    "type": item.get("type"),
                    "description": item.get("description")
                })
            
            return {"success": True, "categories": categories}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            # Return empty result with a note instead of error
            return {
                "success": True, 
                "categories": [],
                "note": f"Browse not available for this category. Try using Search instead."
            }
        except Exception as e:
            logger.error(f"Targeting browse error: {e}")
            return {
                "success": True, 
                "categories": [],
                "note": "Browse not available. Try using Search instead."
            }
    
    async def browse_targeting(
        self,
        target_type: str = "adinterest",
        targeting_class: str = "interests"
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._browse_targeting_sync,
            target_type,
            targeting_class
        )
    
    def _get_geo_locations_sync(
        self,
        query: str,
        location_types: List[str] = None
    ) -> Dict[str, Any]:
        """Search for geo locations."""
        try:
            self._init_api()
            
            params = {
                "q": query,
                "type": "adgeolocation",
            }
            if location_types:
                params["location_types"] = location_types
            
            results = TargetingSearch.search(params=params)
            
            locations = []
            for item in results:
                locations.append({
                    "key": item.get("key"),
                    "name": item.get("name"),
                    "type": item.get("type"),
                    "country_code": item.get("country_code"),
                    "region": item.get("region"),
                    "supports_city": item.get("supports_city", False),
                    "supports_region": item.get("supports_region", False)
                })
            
            return {"success": True, "locations": locations}
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Geo location search error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_geo_locations(
        self,
        query: str,
        location_types: List[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper."""
        return await asyncio.to_thread(
            self._get_geo_locations_sync,
            query,
            location_types
        )


# Targeting type constants for search
TARGETING_TYPES = {
    "interests": "adinterest",
    "behaviors": "adbehavior",
    "demographics": "addemographic",
    "locations": "adgeolocation",
    "schools": "adeducationschool",
    "employers": "adworkemployer",
    "job_titles": "adworkposition",
    "languages": "adlocale"
}

# Browse classes for adTargetingCategory per Meta API documentation
# https://developers.facebook.com/docs/marketing-api/audiences/reference/targeting-search
BROWSE_CLASSES = [
    # Audience Categories
    "interests",           # Interests and hobbies
    "behaviors",           # Purchase behaviors, activities
    "demographics",        # Demographics details
    "life_events",         # Major life events
    "industries",          # Industry interests
    "income",              # Income ranges
    "family_statuses",     # Family and relationship status
    # Education & Work
    "education_schools",   # Schools and universities
    "work_employers",      # Employers and companies
    "work_positions",      # Job titles and positions
    "colleges",            # Colleges
    # Device Categories
    "user_device",         # Device types (iPhone, Android, etc.)
    "user_os",             # Operating systems (iOS, Android, Windows)
]
