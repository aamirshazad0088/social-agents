"""
Meta Ads API - SDK Lead Forms Endpoints
Handles lead form operations
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sdk", tags=["SDK Features - Lead Forms"])


@router.get("/leadforms")
async def get_lead_forms(request: Request):
    """
    GET /api/v1/meta-ads/sdk/leadforms
    
    Get lead forms for the connected page.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        page_id = creds.get("page_id")
        if not page_id:
            raise HTTPException(
                status_code=400,
                detail="No Facebook Page connected. Lead forms require a page."
            )
        
        from ....services.meta_ads.sdk_lead_forms import LeadFormsService
        service = LeadFormsService(creds["access_token"])
        
        result = await service.get_lead_forms(page_id=page_id)
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get lead forms error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/leadforms/{form_id}/leads")
async def get_form_leads(
    request: Request,
    form_id: str = Path(...),
    limit: int = Query(25, le=100)
):
    """
    GET /api/v1/meta-ads/sdk/leadforms/{form_id}/leads
    
    Get leads from a specific lead form.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        creds = await get_verified_credentials(workspace_id, user_id)
        
        from ....services.meta_ads.sdk_lead_forms import LeadFormsService
        service = LeadFormsService(creds["access_token"])
        
        result = await service.get_leads(form_id=form_id, limit=limit)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Get form leads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
