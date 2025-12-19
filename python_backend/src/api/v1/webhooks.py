"""
Webhooks API Router
Handle real-time updates from Meta Marketing API and other platforms
"""

import hmac
import hashlib
import json
import logging
from typing import Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from src.config import settings


router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)


# ================== CONFIG ==================

META_APP_SECRET = getattr(settings, "META_APP_SECRET", None) or getattr(settings, "FACEBOOK_APP_SECRET", None)
META_WEBHOOK_VERIFY_TOKEN = getattr(settings, "META_WEBHOOK_VERIFY_TOKEN", "meta_ads_webhook_token")


# ================== SCHEMAS ==================

class WebhookEvent(BaseModel):
    """Webhook event log entry"""
    type: str
    account_id: Optional[str] = None
    campaign_id: Optional[str] = None
    adset_id: Optional[str] = None
    ad_id: Optional[str] = None
    field: str
    value: Any
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


# ================== HELPER FUNCTIONS ==================

def verify_webhook_signature(payload: str, signature: str) -> bool:
    """
    Verify webhook signature from Meta using HMAC-SHA256.
    
    Args:
        payload: Raw request body as string
        signature: Signature from X-Hub-Signature-256 header (without 'sha256=' prefix)
    
    Returns:
        True if signature is valid, False otherwise
    """
    if not META_APP_SECRET:
        # Allow in development when secret is not configured
        logger.warning("META_APP_SECRET not configured, skipping signature verification")
        return True
    
    try:
        expected_signature = hmac.new(
            META_APP_SECRET.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        # Use compare_digest for timing-safe comparison
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False


async def log_webhook_event(event: WebhookEvent) -> None:
    """
    Log webhook event to database/logging system.
    
    In production, this should store events in a webhook_events table.
    Currently logs to application logger.
    """
    try:
        # Log the event
        logger.info(f"Webhook Event: {event.type} - {event.message}")
        
        # TODO: Store in database when webhook_events table is created
        # supabase = get_supabase_client()
        # await supabase.table("webhook_events").insert({
        #     "type": event.type,
        #     "account_id": event.account_id,
        #     "campaign_id": event.campaign_id,
        #     "adset_id": event.adset_id,
        #     "ad_id": event.ad_id,
        #     "field": event.field,
        #     "value": json.dumps(event.value),
        #     "message": event.message,
        #     "created_at": event.timestamp,
        # }).execute()
        
    except Exception as e:
        logger.error(f"Failed to log webhook event: {e}")


async def notify_campaign_status_change(campaign_id: str, status: str) -> None:
    """Notify users of campaign status changes (PAUSED, ARCHIVED, etc.)"""
    logger.info(f"Campaign {campaign_id} status changed to {status}")
    # TODO: Implement notification system (email, in-app, Slack/Discord)


async def notify_ad_disapproval(ad_id: str) -> None:
    """Notify users of ad disapproval"""
    logger.warning(f"Ad {ad_id} was disapproved")
    # TODO: Implement notification system


# ================== EVENT HANDLERS ==================

async def handle_ad_account_change(account_id: str, change: dict) -> None:
    """Handle ad account level changes"""
    field = change.get("field", "")
    value = change.get("value")
    
    if field == "spend_cap":
        await log_webhook_event(WebhookEvent(
            type="ad_account_spend_cap",
            account_id=account_id,
            field=field,
            value=value,
            message=f"Ad account {account_id} reached spend cap"
        ))
    elif field == "account_status":
        await log_webhook_event(WebhookEvent(
            type="ad_account_status",
            account_id=account_id,
            field=field,
            value=value,
            message=f"Ad account {account_id} status changed to {value}"
        ))
    else:
        await log_webhook_event(WebhookEvent(
            type="ad_account_change",
            account_id=account_id,
            field=field,
            value=value,
            message=f"Ad account {account_id} field {field} changed"
        ))


async def handle_campaign_change(campaign_id: str, change: dict) -> None:
    """Handle campaign level changes"""
    field = change.get("field", "")
    value = change.get("value")
    
    if field == "status":
        await log_webhook_event(WebhookEvent(
            type="campaign_status",
            campaign_id=campaign_id,
            field=field,
            value=value,
            message=f"Campaign {campaign_id} status changed to {value}"
        ))
        # Notify if paused/archived
        if value in ["PAUSED", "ARCHIVED"]:
            await notify_campaign_status_change(campaign_id, value)
            
    elif field in ["daily_budget", "lifetime_budget"]:
        await log_webhook_event(WebhookEvent(
            type="campaign_budget",
            campaign_id=campaign_id,
            field=field,
            value=value,
            message=f"Campaign {campaign_id} budget changed"
        ))
    elif field == "effective_status":
        await log_webhook_event(WebhookEvent(
            type="campaign_effective_status",
            campaign_id=campaign_id,
            field=field,
            value=value,
            message=f"Campaign {campaign_id} effective status changed to {value}"
        ))
    else:
        await log_webhook_event(WebhookEvent(
            type="campaign_change",
            campaign_id=campaign_id,
            field=field,
            value=value,
            message=f"Campaign {campaign_id} field {field} changed"
        ))


async def handle_adset_change(adset_id: str, change: dict) -> None:
    """Handle ad set level changes"""
    field = change.get("field", "")
    value = change.get("value")
    
    if field == "status":
        await log_webhook_event(WebhookEvent(
            type="adset_status",
            adset_id=adset_id,
            field=field,
            value=value,
            message=f"Ad Set {adset_id} status changed to {value}"
        ))
    elif field in ["daily_budget", "lifetime_budget"]:
        await log_webhook_event(WebhookEvent(
            type="adset_budget",
            adset_id=adset_id,
            field=field,
            value=value,
            message=f"Ad Set {adset_id} budget changed"
        ))
    elif field == "delivery_status":
        await log_webhook_event(WebhookEvent(
            type="adset_delivery_status",
            adset_id=adset_id,
            field=field,
            value=value,
            message=f"Ad Set {adset_id} delivery status: {value}"
        ))
    else:
        await log_webhook_event(WebhookEvent(
            type="adset_change",
            adset_id=adset_id,
            field=field,
            value=value,
            message=f"Ad Set {adset_id} field {field} changed"
        ))


async def handle_ad_change(ad_id: str, change: dict) -> None:
    """Handle ad level changes"""
    field = change.get("field", "")
    value = change.get("value")
    
    if field == "status":
        await log_webhook_event(WebhookEvent(
            type="ad_status",
            ad_id=ad_id,
            field=field,
            value=value,
            message=f"Ad {ad_id} status changed to {value}"
        ))
        # Notify if disapproved
        if value == "DISAPPROVED":
            await notify_ad_disapproval(ad_id)
            
    elif field == "effective_status":
        await log_webhook_event(WebhookEvent(
            type="ad_effective_status",
            ad_id=ad_id,
            field=field,
            value=value,
            message=f"Ad {ad_id} effective status changed to {value}"
        ))
    else:
        await log_webhook_event(WebhookEvent(
            type="ad_change",
            ad_id=ad_id,
            field=field,
            value=value,
            message=f"Ad {ad_id} field {field} changed"
        ))


# ================== META ADS WEBHOOKS ==================

@router.get("/meta-ads")
async def verify_meta_ads_webhook(
    request: Request
):
    """
    GET /api/v1/webhooks/meta-ads
    Webhook verification endpoint (required by Meta for subscription setup).
    
    Meta sends verification request with:
    - hub.mode: 'subscribe'
    - hub.verify_token: Your configured verify token
    - hub.challenge: Challenge string to return
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # Verify token matches expected value
    if mode == "subscribe" and token == META_WEBHOOK_VERIFY_TOKEN:
        logger.info("Meta webhook verification successful")
        return Response(content=challenge, media_type="text/plain")
    
    logger.warning(f"Meta webhook verification failed: mode={mode}, token_match={token == META_WEBHOOK_VERIFY_TOKEN}")
    raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/meta-ads")
async def handle_meta_ads_webhook(request: Request):
    """
    POST /api/v1/webhooks/meta-ads
    Handle webhook events from Meta Marketing API.
    
    Processes real-time notifications for:
    - Campaign status changes
    - Ad set status changes
    - Ad status/disapprovals
    - Budget alerts
    - Delivery issues
    
    Always returns 200 to acknowledge receipt (prevents Meta from retrying).
    """
    try:
        # Get raw body for signature verification
        raw_body = await request.body()
        raw_body_str = raw_body.decode("utf-8")
        
        # Get signature from header
        signature_header = request.headers.get("x-hub-signature-256", "")
        signature = signature_header.replace("sha256=", "")
        
        # Verify signature
        if signature and not verify_webhook_signature(raw_body_str, signature):
            logger.error("Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse body
        body = json.loads(raw_body_str)
        object_type = body.get("object", "")
        
        # Process events based on object type
        if object_type == "ad_account":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    await handle_ad_account_change(entry.get("id", ""), change)
                    
        elif object_type == "campaign":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    await handle_campaign_change(entry.get("id", ""), change)
                    
        elif object_type == "adset":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    await handle_adset_change(entry.get("id", ""), change)
                    
        elif object_type == "ad":
            for entry in body.get("entry", []):
                for change in entry.get("changes", []):
                    await handle_ad_change(entry.get("id", ""), change)
        else:
            logger.info(f"Received webhook for unknown object type: {object_type}")
        
        # Always return 200 to acknowledge receipt
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        # Still return 200 to prevent Meta from retrying
        return {"success": False, "error": "Processing failed"}


# ================== INFO ENDPOINT ==================

@router.get("/")
async def get_webhooks_info():
    """Get Webhooks service information"""
    return {
        "service": "Webhooks",
        "version": "1.0.0",
        "endpoints": {
            "meta-ads": {
                "GET": "Webhook verification (required by Meta)",
                "POST": "Handle Meta Ads webhook events"
            }
        },
        "supported_events": {
            "ad_account": ["spend_cap", "account_status"],
            "campaign": ["status", "daily_budget", "lifetime_budget", "effective_status"],
            "adset": ["status", "daily_budget", "lifetime_budget", "delivery_status"],
            "ad": ["status", "effective_status"]
        },
        "signature_verification": META_APP_SECRET is not None
    }
