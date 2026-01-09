"""
Meta Ads API - Bulk Operations Endpoints
Handles bulk actions on campaigns, ad sets, and ads
"""
import logging
from typing import List

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_ads_service import get_meta_ads_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Bulk Operations"])


class BulkActionRequest(BaseModel):
    """Request body for bulk actions"""
    ids: List[str]
    action: str  # PAUSE, ACTIVATE, DELETE, ARCHIVE


@router.post("/campaigns/bulk")
async def bulk_campaign_action(request: Request, body: BulkActionRequest):
    """
    POST /api/v1/meta-ads/campaigns/bulk
    
    Perform bulk action on multiple campaigns.
    
    Actions: PAUSE, ACTIVATE, DELETE, ARCHIVE
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        service = get_meta_ads_service()
        results = {"success": [], "failed": []}
        
        status_map = {
            "PAUSE": "PAUSED",
            "ACTIVATE": "ACTIVE",
            "DELETE": "DELETED",
            "ARCHIVE": "ARCHIVED"
        }
        
        for campaign_id in body.ids:
            try:
                if body.action == "DELETE":
                    result = await service.delete_campaign(campaign_id, credentials["access_token"])
                else:
                    result = await service.update_campaign(
                        campaign_id,
                        credentials["access_token"],
                        status=status_map.get(body.action.upper(), "PAUSED")
                    )
                
                if result.get("success"):
                    results["success"].append(campaign_id)
                else:
                    results["failed"].append({"id": campaign_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": campaign_id, "error": str(e)})
        
        return JSONResponse(content={
            "success": True,
            "processed": len(results["success"]),
            "failed": len(results["failed"]),
            "results": results
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk campaign action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adsets/bulk")
async def bulk_adset_action(request: Request, body: BulkActionRequest):
    """
    POST /api/v1/meta-ads/adsets/bulk
    
    Perform bulk action on multiple ad sets.
    
    Actions: PAUSE, ACTIVATE, DELETE, ARCHIVE
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        service = get_meta_ads_service()
        results = {"success": [], "failed": []}
        
        status_map = {
            "PAUSE": "PAUSED",
            "ACTIVATE": "ACTIVE",
            "DELETE": "DELETED",
            "ARCHIVE": "ARCHIVED"
        }
        
        for adset_id in body.ids:
            try:
                if body.action == "DELETE":
                    result = await service.delete_adset(adset_id, credentials["access_token"])
                else:
                    result = await service.update_adset(
                        adset_id,
                        credentials["access_token"],
                        status=status_map.get(body.action.upper(), "PAUSED")
                    )
                
                if result.get("success"):
                    results["success"].append(adset_id)
                else:
                    results["failed"].append({"id": adset_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": adset_id, "error": str(e)})
        
        return JSONResponse(content={
            "success": True,
            "processed": len(results["success"]),
            "failed": len(results["failed"]),
            "results": results
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk ad set action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ads/bulk")
async def bulk_ad_action(request: Request, body: BulkActionRequest):
    """
    POST /api/v1/meta-ads/ads/bulk
    
    Perform bulk action on multiple ads.
    
    Actions: PAUSE, ACTIVATE, DELETE, ARCHIVE
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        service = get_meta_ads_service()
        results = {"success": [], "failed": []}
        
        status_map = {
            "PAUSE": "PAUSED",
            "ACTIVATE": "ACTIVE",
            "DELETE": "DELETED",
            "ARCHIVE": "ARCHIVED"
        }
        
        for ad_id in body.ids:
            try:
                if body.action == "DELETE":
                    result = await service.delete_ad(ad_id, credentials["access_token"])
                else:
                    result = await service.update_ad(
                        ad_id,
                        credentials["access_token"],
                        status=status_map.get(body.action.upper(), "PAUSED")
                    )
                
                if result.get("success"):
                    results["success"].append(ad_id)
                else:
                    results["failed"].append({"id": ad_id, "error": result.get("error")})
            except Exception as e:
                results["failed"].append({"id": ad_id, "error": str(e)})
        
        return JSONResponse(content={
            "success": True,
            "processed": len(results["success"]),
            "failed": len(results["failed"]),
            "results": results
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk ad action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-status")
async def bulk_update_status(request: Request):
    """
    POST /api/v1/meta-ads/bulk-status
    
    Bulk update status for multiple campaigns, ad sets, or ads.
    
    Request body:
    {
        "entity_type": "campaign" | "adset" | "ad",
        "entity_ids": ["id1", "id2", ...],
        "status": "ACTIVE" | "PAUSED"
    }
    """
    try:
        from ....services.supabase_service import log_activity
        
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        body = await request.json()
        entity_type = body.get("entity_type")
        entity_ids = body.get("entity_ids", [])
        new_status = body.get("status", "PAUSED")
        
        if not entity_type or not entity_ids:
            raise HTTPException(
                status_code=400,
                detail="entity_type and entity_ids are required"
            )
        
        if entity_type not in ["campaign", "adset", "ad"]:
            raise HTTPException(
                status_code=400,
                detail="entity_type must be 'campaign', 'adset', or 'ad'"
            )
        
        service = get_meta_ads_service()
        result = await service.bulk_update_status(
            access_token=credentials["access_token"],
            entity_type=entity_type,
            entity_ids=entity_ids,
            new_status=new_status
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        # Log activity
        await log_activity(
            user_id=user_id,
            workspace_id=workspace_id,
            action=f"bulk_status_{entity_type}",
            details={
                "count": len(entity_ids),
                "status": new_status,
                "updated": result.get("updated"),
                "failed": result.get("failed")
            }
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk status update: {e}")
        raise HTTPException(status_code=500, detail=str(e))
