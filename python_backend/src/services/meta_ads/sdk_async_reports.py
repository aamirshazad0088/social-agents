"""
SDK Async Reports Service
Meta Business SDK - AdReportRun

Uses:
- facebook_business.adobjects.adreportrun
- facebook_business.adobjects.adaccount

Enables robust asynchronous reporting for large data sets.
"""
import asyncio
import logging
import time
from typing import Optional, Dict, Any, List

from facebook_business.adobjects.adreportrun import AdReportRun
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.exceptions import FacebookRequestError

logger = logging.getLogger(__name__)


class AsyncReportsService:
    """Service for managing async report runs."""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self._init_api()
    
    def _init_api(self):
        from facebook_business.api import FacebookAdsApi
        from ...config import settings
        FacebookAdsApi.init(
            app_id=settings.FACEBOOK_APP_ID,
            app_secret=settings.FACEBOOK_APP_SECRET,
            access_token=self.access_token,
            api_version="v24.0"
        )
    
    def _start_report_sync(
        self,
        account_id: str,
        level: str = "campaign",
        date_preset: str = None,
        time_range: Dict[str, str] = None,
        fields: List[str] = None,
        breakdowns: List[str] = None,
        action_breakdowns: List[str] = None,
        filtering: List[Dict[str, Any]] = None,
        time_increment: str = None
    ) -> Dict[str, Any]:
        """
        Start an async report job.
        
        Args per Meta API docs:
            account_id: Ad account ID
            level: account, campaign, adset, or ad
            date_preset: Predefined date range (last_7d, last_30d, maximum, etc.)
            time_range: Custom date range {"since": "YYYY-MM-DD", "until": "YYYY-MM-DD"}
            fields: Metrics to retrieve
            breakdowns: Group results by dimension (publisher_platform, etc.)
            action_breakdowns: Break down actions by type
            filtering: Filter objects [{field, operator, value}]
            time_increment: 1-90 for daily breakdown, "all_days", "monthly"
        """
        try:
            account = AdAccount(f"act_{account_id}")
            
            # Default fields if not provided
            if not fields:
                fields = [
                    "campaign_name", "adset_name", "ad_name",
                    "impressions", "clicks", "spend", "reach",
                    "cpc", "cpm", "ctr", "frequency",
                    "actions", "action_values", "cost_per_action_type",
                    "conversions", "cost_per_conversion"
                ]
            
            params = {"level": level}
            
            # Date configuration - time_range takes precedence over date_preset
            if time_range and isinstance(time_range, dict):
                params["time_range"] = time_range
            elif date_preset:
                params["date_preset"] = date_preset
            else:
                params["date_preset"] = "last_30d"  # Default
            
            # Optional parameters
            if breakdowns:
                params["breakdowns"] = breakdowns
            if action_breakdowns:
                params["action_breakdowns"] = action_breakdowns
            if filtering:
                params["filtering"] = filtering
            if time_increment:
                params["time_increment"] = time_increment
            
            job = account.get_insights(
                fields=fields,
                params=params,
                is_async=True
            )
            
            return {
                "success": True,
                "report_run_id": job["report_run_id"],
                "status": "STARTED"
            }
            
        except FacebookRequestError as e:
            logger.error(f"Async report start error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Async report start error: {e}")
            return {"success": False, "error": str(e)}
    
    async def start_report(
        self,
        account_id: str,
        level: str = "campaign",
        date_preset: str = None,
        time_range: Dict[str, str] = None,
        fields: List[str] = None,
        breakdowns: List[str] = None,
        action_breakdowns: List[str] = None,
        filtering: List[Dict[str, Any]] = None,
        time_increment: str = None
    ) -> Dict[str, Any]:
        """Async wrapper to start report."""
        return await asyncio.to_thread(
            self._start_report_sync,
            account_id,
            level,
            date_preset,
            time_range,
            fields,
            breakdowns,
            action_breakdowns,
            filtering,
            time_increment
        )
    
    def _check_status_sync(self, report_run_id: str) -> Dict[str, Any]:
        """Check status of a report run."""
        try:
            report = AdReportRun(report_run_id)
            report.remote_read()
            
            return {
                "success": True,
                "report_run_id": report_run_id,
                "async_status": report["async_status"],
                "async_percent_completion": report["async_percent_completion"]
            }
            
        except FacebookRequestError as e:
            return {"success": False, "error": str(e)}
    
    async def check_status(self, report_run_id: str) -> Dict[str, Any]:
        """Async wrapper to check status."""
        return await asyncio.to_thread(self._check_status_sync, report_run_id)
    
    def _get_results_sync(self, report_run_id: str, limit: int = 100) -> Dict[str, Any]:
        """Get results of a completed report."""
        try:
            report = AdReportRun(report_run_id)
            insights = report.get_insights(params={"limit": limit})
            
            data = [dict(insight) for insight in insights]
            
            logger.info(f"Report {report_run_id} returned {len(data)} rows")
            
            # If no data, provide helpful message
            if len(data) == 0:
                return {
                    "success": True,
                    "data": [],
                    "count": 0,
                    "message": "No data returned. This usually means no ads had delivery (impressions/spend) during the selected time period."
                }
            
            return {
                "success": True,
                "data": data,
                "count": len(data)
            }
            
        except FacebookRequestError as e:
            logger.error(f"Facebook API error getting results: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Error getting report results: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_results(self, report_run_id: str, limit: int = 100) -> Dict[str, Any]:
        """Async wrapper to get results."""
        return await asyncio.to_thread(self._get_results_sync, report_run_id, limit)
