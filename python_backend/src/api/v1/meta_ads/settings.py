"""
Meta Ads API - Account/Business Settings Endpoints
Handles ad account and business settings management
"""
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.meta_ads.meta_ads_service import get_meta_ads_service
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Settings"])


@router.get("/settings/ad-account")
async def get_ad_account_settings(request: Request):
    """
    GET /api/v1/meta-ads/settings/ad-account
    
    Get ad account settings.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        service = get_meta_ads_service()
        result = await service.get_ad_account_info(
            credentials["account_id"],
            credentials["access_token"]
        )
        
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "adAccount": result.get("adAccount")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ad account settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/business")
async def get_business_settings(request: Request):
    """
    GET /api/v1/meta-ads/settings/business
    
    Get business settings and info.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_business_info(
            business_id=credentials.get("business_id")
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "business": result.get("business")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting business settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/team")
async def get_team_access(request: Request):
    """
    GET /api/v1/meta-ads/settings/team
    
    Get team access and roles for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_ad_account_users(
            account_id=credentials["account_id"]
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "users": result.get("users", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting team access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/notifications")
async def get_notification_settings(request: Request):
    """
    GET /api/v1/meta-ads/settings/notifications
    
    Get notification settings for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_notification_settings(
            account_id=credentials["account_id"]
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "settings": result.get("settings", {})
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting notification settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings/funding")
async def get_funding_sources(request: Request):
    """
    GET /api/v1/meta-ads/settings/funding
    
    Get funding sources (payment methods) for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_funding_sources(
            account_id=credentials["account_id"]
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "fundingSources": result.get("funding_sources", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting funding sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activities")
async def get_activities(
    request: Request,
    since: Optional[str] = Query(None, description="ISO date string"),
    until: Optional[str] = Query(None, description="ISO date string"),
    limit: int = Query(50, le=100)
):
    """
    GET /api/v1/meta-ads/activities
    
    Get activity log for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_ad_account_activities(
            account_id=credentials["account_id"],
            since=since,
            until=until,
            limit=limit
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "activities": result.get("activities", []),
            "paging": result.get("paging")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/billing/invoices")
async def get_invoices(
    request: Request,
    limit: int = Query(25, le=50)
):
    """
    GET /api/v1/meta-ads/billing/invoices
    
    Get billing invoices for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_ad_account_invoices(
            account_id=credentials["account_id"],
            limit=limit
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "invoices": result.get("invoices", [])
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ALIAS ROUTES - Match frontend expected paths
# ============================================================================

@router.get("/accounts/settings")
async def get_accounts_settings(request: Request):
    """
    GET /api/v1/meta-ads/accounts/settings
    
    Alias for /settings/ad-account to match frontend expectations.
    """
    return await get_ad_account_settings(request)


@router.get("/accounts/activities")
async def get_accounts_activities(
    request: Request,
    since: Optional[str] = Query(None, description="ISO date string"),
    until: Optional[str] = Query(None, description="ISO date string"),
    limit: int = Query(50, le=100)
):
    """
    GET /api/v1/meta-ads/accounts/activities
    
    Alias for /activities to match frontend expectations.
    """
    return await get_activities(request, since, until, limit)


@router.get("/team/access")
async def get_team_access_alias(request: Request):
    """
    GET /api/v1/meta-ads/team/access
    
    Alias for /settings/team to match frontend expectations.
    """
    return await get_team_access(request)


@router.get("/notifications/settings")
async def get_notifications_settings_alias(request: Request):
    """
    GET /api/v1/meta-ads/notifications/settings
    
    Alias for /settings/notifications to match frontend expectations.
    """
    return await get_notification_settings(request)
