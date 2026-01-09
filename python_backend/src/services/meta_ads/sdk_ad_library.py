"""
SDK Ad Library Service
Meta Business SDK - Ad Library API

Uses official Ad Library API for competitor analysis:
- Search competitor ads
- Get ad details
- Analyze ad performance
"""
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

# Ad Library API endpoint (Standardized to v24.0)
AD_LIBRARY_API = "https://graph.facebook.com/v24.0/ads_archive"


class AdLibraryService:
    """Service for searching Meta Ad Library using official API."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    async def search_ads(
        self,
        search_terms: str,
        ad_type: str = "ALL",
        ad_reached_countries: List[str] = None,
        ad_active_status: str = "ALL",
        publisher_platforms: List[str] = None,
        search_page_ids: List[str] = None,
        media_type: str = None,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Search Meta Ad Library for competitor ads.
        
        Args:
            search_terms: Keywords to search for
            ad_type: ALL, POLITICAL_AND_ISSUE_ADS, HOUSING_ADS, etc.
            ad_reached_countries: List of country codes (e.g., ["US", "GB"])
            ad_active_status: ALL, ACTIVE, INACTIVE
            publisher_platforms: ["facebook", "instagram", "messenger", "audience_network"]
            search_page_ids: Specific page IDs to search
            media_type: IMAGE, VIDEO, MEME, NONE
            limit: Max results (1-100)
        """
        try:
            params = {
                "access_token": self.access_token,
                "search_terms": search_terms,
                "ad_type": ad_type,
                "ad_active_status": ad_active_status,
                "limit": min(limit, 100),
                "fields": ",".join([
                    "id",
                    "ad_creation_time",
                    "ad_creative_bodies",
                    "ad_creative_link_captions",
                    "ad_creative_link_descriptions",
                    "ad_creative_link_titles",
                    "ad_delivery_start_time",
                    "ad_delivery_stop_time",
                    "ad_snapshot_url",
                    "bylines",
                    "currency",
                    "estimated_audience_size",
                    "impressions",
                    "languages",
                    "page_id",
                    "page_name",
                    "publisher_platforms",
                    "spend",
                    "target_ages",
                    "target_gender",
                    "target_locations",
                ])
            }
            
            if ad_reached_countries:
                params["ad_reached_countries"] = ad_reached_countries
            if publisher_platforms:
                params["publisher_platforms"] = publisher_platforms
            if search_page_ids:
                params["search_page_ids"] = search_page_ids
            if media_type:
                params["media_type"] = media_type
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(AD_LIBRARY_API, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    ads = data.get("data", [])
                    
                    # Process and enrich ads
                    processed_ads = []
                    for ad in ads:
                        processed_ads.append({
                            "id": ad.get("id"),
                            "page_name": ad.get("page_name"),
                            "page_id": ad.get("page_id"),
                            "ad_text": (ad.get("ad_creative_bodies") or [""])[0],
                            "headline": (ad.get("ad_creative_link_titles") or [""])[0],
                            "description": (ad.get("ad_creative_link_descriptions") or [""])[0],
                            "snapshot_url": ad.get("ad_snapshot_url"),
                            "platforms": ad.get("publisher_platforms", []),
                            "start_date": ad.get("ad_delivery_start_time"),
                            "end_date": ad.get("ad_delivery_stop_time"),
                            "impressions": ad.get("impressions", {}),
                            "spend": ad.get("spend", {}),
                            "audience_size": ad.get("estimated_audience_size", {}),
                            "target_ages": ad.get("target_ages"),
                            "target_gender": ad.get("target_gender"),
                            "target_locations": ad.get("target_locations", []),
                            "languages": ad.get("languages", []),
                            "is_active": ad.get("ad_delivery_stop_time") is None
                        })
                    
                    return {
                        "success": True,
                        "ads": processed_ads,
                        "total": len(processed_ads),
                        "paging": data.get("paging")
                    }
                else:
                    error = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error.get("message", "API request failed")
                    }
                    
        except Exception as e:
            logger.error(f"Ad Library search error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_page_ads(
        self,
        page_id: str,
        ad_active_status: str = "ACTIVE",
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all ads for a specific page."""
        return await self.search_ads(
            search_terms="",
            search_page_ids=[page_id],
            ad_active_status=ad_active_status,
            limit=limit
        )
    
    async def analyze_competitor_strategy(
        self,
        page_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a competitor's ad strategy based on verified Ad Library data.
        Returns pure statistics (no inferred keywords or strategy claims).
        """
        ads_result = await self.get_page_ads(page_id, limit=100)
        
        if not ads_result.get("success"):
            return ads_result
        
        ads = ads_result.get("ads", [])
        
        if not ads:
            return {
                "success": True,
                "analysis": {
                    "total_ads": 0,
                    "message": "No ads found for this page"
                }
            }
        
        # Analyze platforms
        platform_counts = {}
        for ad in ads:
            for platform in ad.get("platforms", []):
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        # Analyze active vs inactive
        active_count = sum(1 for ad in ads if ad.get("is_active"))
        
        # Ad format distribution
        text_only = sum(1 for ad in ads if not ad.get("snapshot_url"))
        with_media = len(ads) - text_only
        
        return {
            "success": True,
            "analysis": {
                "total_ads": len(ads),
                "active_ads": active_count,
                "inactive_ads": len(ads) - active_count,
                "platform_distribution": platform_counts,
                "format_distribution": {
                    "with_media": with_media,
                    "text_only": text_only
                },
                "avg_ad_age_days": self._calculate_avg_age(ads)
            }
        }
    
    def _calculate_avg_age(self, ads: List[Dict]) -> float:
        """Calculate average age of ads in days."""
        ages = []
        now = datetime.now()
        for ad in ads:
            start = ad.get("start_date")
            if start:
                try:
                    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    age = (now - start_dt.replace(tzinfo=None)).days
                    ages.append(age)
                except:
                    pass
        return round(sum(ages) / len(ages), 1) if ages else 0
    """Service for searching Meta Ad Library using official API."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
    
    async def search_ads(
        self,
        search_terms: str,
        ad_type: str = "ALL",
        ad_reached_countries: List[str] = None,
        ad_active_status: str = "ALL",
        publisher_platforms: List[str] = None,
        search_page_ids: List[str] = None,
        media_type: str = None,
        limit: int = 25
    ) -> Dict[str, Any]:
        """
        Search Meta Ad Library for competitor ads.
        
        Args:
            search_terms: Keywords to search for
            ad_type: ALL, POLITICAL_AND_ISSUE_ADS, HOUSING_ADS, etc.
            ad_reached_countries: List of country codes (e.g., ["US", "GB"])
            ad_active_status: ALL, ACTIVE, INACTIVE
            publisher_platforms: ["facebook", "instagram", "messenger", "audience_network"]
            search_page_ids: Specific page IDs to search
            media_type: IMAGE, VIDEO, MEME, NONE
            limit: Max results (1-100)
        """
        try:
            params = {
                "access_token": self.access_token,
                "search_terms": search_terms,
                "ad_type": ad_type,
                "ad_active_status": ad_active_status,
                "limit": min(limit, 100),
                "fields": ",".join([
                    "id",
                    "ad_creation_time",
                    "ad_creative_bodies",
                    "ad_creative_link_captions",
                    "ad_creative_link_descriptions",
                    "ad_creative_link_titles",
                    "ad_delivery_start_time",
                    "ad_delivery_stop_time",
                    "ad_snapshot_url",
                    "bylines",
                    "currency",
                    "estimated_audience_size",
                    "impressions",
                    "languages",
                    "page_id",
                    "page_name",
                    "publisher_platforms",
                    "spend",
                    "target_ages",
                    "target_gender",
                    "target_locations",
                ])
            }
            
            if ad_reached_countries:
                params["ad_reached_countries"] = ad_reached_countries
            if publisher_platforms:
                params["publisher_platforms"] = publisher_platforms
            if search_page_ids:
                params["search_page_ids"] = search_page_ids
            if media_type:
                params["media_type"] = media_type
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(AD_LIBRARY_API, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    ads = data.get("data", [])
                    
                    # Process and enrich ads
                    processed_ads = []
                    for ad in ads:
                        processed_ads.append({
                            "id": ad.get("id"),
                            "page_name": ad.get("page_name"),
                            "page_id": ad.get("page_id"),
                            "ad_text": (ad.get("ad_creative_bodies") or [""])[0],
                            "headline": (ad.get("ad_creative_link_titles") or [""])[0],
                            "description": (ad.get("ad_creative_link_descriptions") or [""])[0],
                            "snapshot_url": ad.get("ad_snapshot_url"),
                            "platforms": ad.get("publisher_platforms", []),
                            "start_date": ad.get("ad_delivery_start_time"),
                            "end_date": ad.get("ad_delivery_stop_time"),
                            "impressions": ad.get("impressions", {}),
                            "spend": ad.get("spend", {}),
                            "audience_size": ad.get("estimated_audience_size", {}),
                            "target_ages": ad.get("target_ages"),
                            "target_gender": ad.get("target_gender"),
                            "target_locations": ad.get("target_locations", []),
                            "languages": ad.get("languages", []),
                            "is_active": ad.get("ad_delivery_stop_time") is None
                        })
                    
                    return {
                        "success": True,
                        "ads": processed_ads,
                        "total": len(processed_ads),
                        "paging": data.get("paging")
                    }
                else:
                    error = response.json().get("error", {})
                    return {
                        "success": False,
                        "error": error.get("message", "API request failed")
                    }
                    
        except Exception as e:
            logger.error(f"Ad Library search error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_page_ads(
        self,
        page_id: str,
        ad_active_status: str = "ACTIVE",
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all ads for a specific page."""
        return await self.search_ads(
            search_terms="",
            search_page_ids=[page_id],
            ad_active_status=ad_active_status,
            limit=limit
        )
    
    async def analyze_competitor_strategy(
        self,
        page_id: str
    ) -> Dict[str, Any]:
        """
        Analyze a competitor's ad strategy based on their Ad Library data.
        """
        ads_result = await self.get_page_ads(page_id, limit=100)
        
        if not ads_result.get("success"):
            return ads_result
        
        ads = ads_result.get("ads", [])
        
        if not ads:
            return {
                "success": True,
                "analysis": {
                    "total_ads": 0,
                    "message": "No ads found for this page"
                }
            }
        
        # Analyze platforms
        platform_counts = {}
        for ad in ads:
            for platform in ad.get("platforms", []):
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        # Analyze active vs inactive
        active_count = sum(1 for ad in ads if ad.get("is_active"))
        
        # Common words in headlines
        headlines = [ad.get("headline", "") for ad in ads if ad.get("headline")]
        word_freq = {}
        for headline in headlines:
            for word in headline.lower().split():
                if len(word) > 3:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Ad format distribution
        text_only = sum(1 for ad in ads if not ad.get("snapshot_url"))
        with_media = len(ads) - text_only
        
        return {
            "success": True,
            "analysis": {
                "total_ads": len(ads),
                "active_ads": active_count,
                "inactive_ads": len(ads) - active_count,
                "platform_distribution": platform_counts,
                "top_keywords": [{"word": w, "count": c} for w, c in top_keywords],
                "format_distribution": {
                    "with_media": with_media,
                    "text_only": text_only
                },
                "avg_ad_age_days": self._calculate_avg_age(ads)
            }
        }
    
    def _calculate_avg_age(self, ads: List[Dict]) -> float:
        """Calculate average age of ads in days."""
        ages = []
        now = datetime.now()
        for ad in ads:
            start = ad.get("start_date")
            if start:
                try:
                    start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    age = (now - start_dt.replace(tzinfo=None)).days
                    ages.append(age)
                except:
                    pass
        return round(sum(ages) / len(ages), 1) if ages else 0
