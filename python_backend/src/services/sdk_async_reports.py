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
        FacebookAdsApi.init(access_token=self.access_token, api_version="v24.0")
    
    def _start_report_sync(
        self,
        account_id: str,
        level: str = "campaign",
        date_preset: str = "last_30d",
        fields: List[str] = None,
        breakdowns: List[str] = None
    ) -> Dict[str, Any]:
        """Start an async report job."""
        try:
            account = AdAccount(f"act_{account_id}")
            
            if not fields:
                fields = [
                    "campaign_name", "adset_name", "ad_name",
                    "impressions", "clicks", "spend", "reach",
                    "cpc", "cpm", "ctr", "actions"
                ]
            
            params = {
                "level": level,
                "date_preset": date_preset,
            }
            
            if breakdowns:
                params["breakdowns"] = breakdowns
            
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
    
    async def start_report(
        self,
        account_id: str,
        level: str = "campaign",
        date_preset: str = "last_30d",
        fields: List[str] = None,
        breakdowns: List[str] = None
    ) -> Dict[str, Any]:
        """Async wrapper to start report."""
        return await asyncio.to_thread(
            self._start_report_sync,
            account_id,
            level,
            date_preset,
            fields,
            breakdowns
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
            
            return {
                "success": True,
                "data": data,
                "count": len(data)
            }
            
        except FacebookRequestError as e:
            return {"success": False, "error": str(e)}
    
    async def get_results(self, report_run_id: str, limit: int = 100) -> Dict[str, Any]:
        """Async wrapper to get results."""
        return await asyncio.to_thread(self._get_results_sync, report_run_id, limit)
