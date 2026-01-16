"""
Meta Ads API - SDK Reach Estimation Endpoints
Uses delivery_estimate edge for audience size estimation.

Note: reachfrequencypredictions API requires campaign_group_id, day_parting_schedule
and other campaign-specific parameters. For standalone reach estimation without
campaign context, use delivery_estimate which is simpler and works directly.
"""
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Reach"])


@router.post("/reach/estimate")
async def estimate_reach(request: Request):
    """
    POST /api/v1/meta-ads/sdk/reach/estimate
    
    Estimate audience reach using delivery_estimate API.
    This works without campaign context and returns DAU/MAU estimates.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        targeting_spec = body.get("targeting_spec", {})
        optimization_goal = body.get("optimization_goal", "LINK_CLICKS")
        
        from ....services.meta_ads.sdk_reach_estimation import ReachEstimationService
        service = ReachEstimationService(creds["access_token"])
        
        result = await service.get_delivery_estimate(
            account_id=creds["account_id"].replace("act_", ""),
            targeting_spec=targeting_spec,
            optimization_goal=optimization_goal
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Reach estimation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reach/delivery")
async def estimate_delivery(request: Request):
    """
    POST /api/v1/meta-ads/sdk/reach/delivery
    
    Alias for reach/estimate - both use delivery_estimate API.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        body = await request.json()
        
        from ....services.meta_ads.sdk_reach_estimation import ReachEstimationService
        service = ReachEstimationService(creds["access_token"])
        
        result = await service.get_delivery_estimate(
            account_id=creds["account_id"].replace("act_", ""),
            targeting_spec=body.get("targeting_spec", {}),
            optimization_goal=body.get("optimization_goal", "LINK_CLICKS")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Delivery estimation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
