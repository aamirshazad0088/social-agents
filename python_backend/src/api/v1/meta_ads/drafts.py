"""
Meta Ads API - Draft Management Endpoints
Handles ad draft creation and management
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context
from ....services.supabase_service import get_supabase_admin_client
from ....schemas.meta_ads import CreateAdDraftRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Drafts"])


@router.get("/ads/draft")
async def list_drafts(
    request: Request,
    workspaceId: Optional[str] = Query(None)
):
    """
    GET /api/v1/meta-ads/ads/draft
    
    List ad drafts
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        workspace_id = workspaceId or workspace_id
        
        client = get_supabase_admin_client()
        result = client.table("meta_ad_drafts").select("*").eq(
            "workspace_id", workspace_id
        ).eq("status", "draft").order("created_at", desc=True).execute()
        
        return JSONResponse(content={
            "drafts": result.data or []
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing drafts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ads/draft")
async def create_draft(request: Request, body: CreateAdDraftRequest):
    """
    POST /api/v1/meta-ads/ads/draft
    
    Create or update an ad draft
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        
        client = get_supabase_admin_client()
        
        draft_data = {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "platform": "facebook",  # Database requires platform field
            "ad_type": body.ad_type.value,
            "objective": body.objective,
            "optimization_goal": body.optimization_goal,
            "billing_event": body.billing_event or "IMPRESSIONS",
            "creative": body.creative,
            "targeting": body.targeting,
            "budget": body.budget,
            "schedule": body.schedule,
            "campaign_name": body.campaign_name,
            "adset_name": body.adset_name,
            "ad_name": body.ad_name,
            "destination_type": body.destination_type,
            "bid_strategy": body.bid_strategy,
            "status": "draft",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = client.table("meta_ad_drafts").insert(draft_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create draft")
        
        return JSONResponse(content={
            "success": True,
            "draft": result.data[0]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/ads/draft/{draft_id}")
async def delete_draft(
    request: Request,
    draft_id: str = Path(...)
):
    """
    DELETE /api/v1/meta-ads/ads/draft/{draft_id}
    
    Delete an ad draft
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        
        client = get_supabase_admin_client()
        client.table("meta_ad_drafts").delete().eq(
            "id", draft_id
        ).eq("workspace_id", workspace_id).execute()
        
        return JSONResponse(content={"success": True})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))
