"""
Meta Ads API - Conversions API (CAPI) Endpoints
Handles server-side event tracking
"""
import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ._helpers import get_user_context, get_verified_credentials, generate_appsecret_proof
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Conversions API"])


class UserData(BaseModel):
    """User data for CAPI events"""
    em: Optional[str] = None  # Email (hashed)
    ph: Optional[str] = None  # Phone (hashed)
    fn: Optional[str] = None  # First name (hashed)
    ln: Optional[str] = None  # Last name (hashed)
    ct: Optional[str] = None  # City (hashed)
    st: Optional[str] = None  # State (hashed)
    zp: Optional[str] = None  # Zip code (hashed)
    country: Optional[str] = None  # Country (hashed)
    external_id: Optional[str] = None  # External ID
    client_ip_address: Optional[str] = None  # Client IP
    client_user_agent: Optional[str] = None  # User agent
    fbc: Optional[str] = None  # Click ID
    fbp: Optional[str] = None  # Browser ID


class CustomData(BaseModel):
    """Custom data for CAPI events"""
    value: Optional[float] = None
    currency: Optional[str] = None
    content_name: Optional[str] = None
    content_category: Optional[str] = None
    content_ids: Optional[List[str]] = None
    contents: Optional[List[dict]] = None
    content_type: Optional[str] = None
    order_id: Optional[str] = None
    predicted_ltv: Optional[float] = None
    num_items: Optional[int] = None
    search_string: Optional[str] = None
    status: Optional[str] = None


class CAPIEvent(BaseModel):
    """CAPI event structure"""
    event_name: str
    event_time: int = None  # Unix timestamp
    event_source_url: Optional[str] = None
    action_source: str = "website"  # website, app, physical_store, etc.
    user_data: UserData
    custom_data: Optional[CustomData] = None
    opt_out: bool = False


class SendCAPIEventsRequest(BaseModel):
    """Request body for sending CAPI events"""
    pixel_id: str
    events: List[CAPIEvent]
    test_event_code: Optional[str] = None  # For testing


@router.post("/capi/events")
async def send_capi_events(request: Request, body: SendCAPIEventsRequest):
    """
    POST /api/v1/meta-ads/capi/events
    
    Send server-side events via Conversions API.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        access_token = credentials["access_token"]
        appsecret_proof = generate_appsecret_proof(access_token)
        
        # Format events for Meta API
        events_data = []
        for event in body.events:
            event_data = {
                "event_name": event.event_name,
                "event_time": event.event_time or int(datetime.now(timezone.utc).timestamp()),
                "action_source": event.action_source,
                "user_data": event.user_data.model_dump(exclude_none=True),
                "opt_out": event.opt_out
            }
            if event.event_source_url:
                event_data["event_source_url"] = event.event_source_url
            if event.custom_data:
                event_data["custom_data"] = event.custom_data.model_dump(exclude_none=True)
            events_data.append(event_data)
        
        client = create_meta_sdk_client(access_token)
        
        result = await client.send_capi_events(
            pixel_id=body.pixel_id,
            events=events_data,
            test_event_code=body.test_event_code,
            appsecret_proof=appsecret_proof
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "events_received": result.get("events_received"),
            "fbtrace_id": result.get("fbtrace_id")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending CAPI events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/capi/test")
async def test_capi_event(request: Request):
    """
    POST /api/v1/meta-ads/capi/test
    
    Send a test event to verify Conversions API setup.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        body = await request.json()
        pixel_id = body.get("pixel_id")
        test_event_code = body.get("test_event_code")
        
        if not pixel_id:
            raise HTTPException(status_code=400, detail="pixel_id is required")
        
        access_token = credentials["access_token"]
        appsecret_proof = generate_appsecret_proof(access_token)
        
        # Create test event
        test_event = {
            "event_name": "PageView",
            "event_time": int(datetime.now(timezone.utc).timestamp()),
            "action_source": "website",
            "user_data": {
                "client_ip_address": "127.0.0.1",
                "client_user_agent": "TestAgent/1.0"
            }
        }
        
        client = create_meta_sdk_client(access_token)
        
        result = await client.send_capi_events(
            pixel_id=pixel_id,
            events=[test_event],
            test_event_code=test_event_code,
            appsecret_proof=appsecret_proof
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "message": "Test event sent successfully",
            "events_received": result.get("events_received"),
            "fbtrace_id": result.get("fbtrace_id")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test CAPI event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capi/diagnostics")
async def get_capi_diagnostics(
    request: Request,
    pixel_id: str = Query(...),
    date_preset: str = Query("last_7d")
):
    """
    GET /api/v1/meta-ads/capi/diagnostics
    
    Get Conversions API diagnostics for a pixel.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_capi_diagnostics(
            pixel_id=pixel_id,
            date_preset=date_preset
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting CAPI diagnostics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
