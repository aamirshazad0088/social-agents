"""
Meta Ads API - SDK Async Reports Endpoints
Handles async report generation
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Async Reports"])


@router.post("/reports/start")
@router.post("/reports/async")  # Alias for frontend compatibility
async def start_async_report(request: Request):
    """
    POST /api/v1/meta-ads/sdk/reports/start
    
    Start an async report job.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        from ....services.meta_ads.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.start_report(
            account_id=creds["account_id"].replace("act_", ""),
            level=body.get("level", "campaign"),
            fields=body.get("fields", []),
            date_preset=body.get("date_preset", "last_30d"),
            time_range=body.get("time_range"),
            breakdowns=body.get("breakdowns"),
            filtering=body.get("filtering"),
            time_increment=body.get("time_increment")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Start async report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_run_id}/status")
async def check_report_status(
    request: Request,
    report_run_id: str = Path(...)
):
    """
    GET /api/v1/meta-ads/sdk/reports/{report_run_id}/status
    
    Check status of an async report.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.check_status(report_run_id=report_run_id)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Check report status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_run_id}/results")
async def get_report_results(
    request: Request,
    report_run_id: str = Path(...),
    limit: int = Query(500, le=5000)
):
    """
    GET /api/v1/meta-ads/sdk/reports/{report_run_id}/results
    
    Get results of a completed async report.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_async_reports import AsyncReportsService
        service = AsyncReportsService(creds["access_token"])
        
        result = await service.get_results(
            report_run_id=report_run_id,
            limit=limit
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get report results error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
