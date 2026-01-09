"""
Meta Ads API - Compliance Endpoints
Handles compliance checks and special ad categories
"""
import logging

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client
from ....schemas.compliance import ComplianceCheckRequest

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Compliance"])


@router.post("/compliance/check")
async def check_compliance(request: Request, body: ComplianceCheckRequest):
    """
    POST /api/v1/meta-ads/compliance/check
    
    Check ad content compliance with Meta policies.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.check_ad_compliance(
            text=body.text,
            image_url=body.image_url,
            destination_url=body.destination_url,
            special_ad_categories=body.special_ad_categories
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking compliance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/special-ad-categories")
async def get_special_ad_categories(request: Request):
    """
    GET /api/v1/meta-ads/special-ad-categories
    
    Get list of special ad categories.
    """
    # From Meta Marketing API documentation
    categories = [
        {
            "value": "CREDIT",
            "label": "Credit",
            "description": "Ads for credit card offers or financial services related to credit"
        },
        {
            "value": "EMPLOYMENT",
            "label": "Employment",
            "description": "Ads for job opportunities, recruitment, or employment-related services"
        },
        {
            "value": "HOUSING",
            "label": "Housing",
            "description": "Ads for sale or rental of housing, homeowners insurance, or mortgage loans"
        },
        {
            "value": "ISSUES_ELECTIONS_POLITICS",
            "label": "Social Issues, Elections or Politics",
            "description": "Ads related to social issues, elections, or political causes"
        }
    ]
    
    return JSONResponse(content={"categories": categories})
