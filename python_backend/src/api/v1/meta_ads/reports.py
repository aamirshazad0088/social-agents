"""
Meta Ads API - Custom Reports Endpoints
Handles custom reporting with metrics and breakdowns
"""
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Reports"])


class GenerateReportRequest(BaseModel):
    """Request body for generating custom reports"""
    name: Optional[str] = None
    level: str = "campaign"
    metrics: List[str]
    breakdowns: Optional[List[str]] = None
    date_preset: str = "last_30d"
    time_range: Optional[dict] = None
    filtering: Optional[List[dict]] = None
    sort: Optional[List[dict]] = None
    limit: int = 100


@router.post("/reports/generate")
async def generate_custom_report(request: Request, body: GenerateReportRequest):
    """
    POST /api/v1/meta-ads/reports/generate
    
    Generate a custom report with specified metrics and breakdowns.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.generate_custom_report(
            account_id=credentials["account_id"],
            level=body.level,
            metrics=body.metrics,
            breakdowns=body.breakdowns,
            date_preset=body.date_preset,
            time_range=body.time_range,
            filtering=body.filtering,
            sort=body.sort,
            limit=body.limit
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "data": result.get("data", []),
            "summary": result.get("summary"),
            "paging": result.get("paging")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/metrics")
async def get_available_metrics(request: Request):
    """
    GET /api/v1/meta-ads/reports/metrics
    
    Get list of available metrics for custom reports.
    """
    from ....schemas.reporting import AVAILABLE_METRICS
    
    return JSONResponse(content={"metrics": AVAILABLE_METRICS})


@router.get("/reports/breakdowns")
async def get_available_breakdowns(request: Request):
    """
    GET /api/v1/meta-ads/reports/breakdowns
    
    Get list of available breakdowns for custom reports.
    """
    from ....schemas.reporting import AVAILABLE_BREAKDOWNS
    
    return JSONResponse(content={"breakdowns": AVAILABLE_BREAKDOWNS})
