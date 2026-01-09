"""
Meta Ads API - Automation Rules Endpoints
Handles automation rule creation, management, and history
"""
import logging
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Path, Query
from fastapi.responses import JSONResponse

from ._helpers import get_user_context, get_verified_credentials
from ....services.supabase_service import log_activity
from ....services.meta_ads.meta_sdk_client import create_meta_sdk_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Meta Ads - Rules"])


@router.post("/rules")
async def create_automation_rule(request: Request):
    """
    POST /api/v1/meta-ads/rules
    
    Create an automation rule.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        body = await request.json()
        
        name = body.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Rule name is required")
        
        # Build evaluation spec from conditions - per Meta Ad Rules Engine docs
        conditions = body.get("conditions", [])
        entity_type = body.get("entity_type", "CAMPAIGN")
        time_preset = body.get("time_preset", "LAST_7D")
        
        # Build filters from conditions
        filters = [
            {
                "field": c["field"],
                "value": c["value"],
                "operator": c["operator"]
            }
            for c in conditions
        ]
        
        # Add entity_type filter per Meta docs
        filters.append({
            "field": "entity_type",
            "value": entity_type,
            "operator": "EQUAL"
        })
        
        evaluation_spec = {
            "evaluation_type": body.get("evaluation_type", "SCHEDULE"),
            "filters": filters,
            "time_preset": time_preset,
        }
        
        # Build execution spec from execution_type - per Meta v24.0 docs
        execution_type = body.get("execution_type", "PAUSE")
        execution_spec = {
            "execution_type": execution_type,
        }
        
        # Handle execution options - per Meta Ad Rules Engine v24.0 docs
        execution_options = body.get("execution_options", {})
        if execution_options:
            exec_opts = []
            
            # Execution limits
            if execution_options.get("execution_count_limit"):
                exec_opts.append({
                    "field": "execution_count_limit",
                    "value": execution_options["execution_count_limit"],
                    "operator": "EQUAL"
                })
            if execution_options.get("action_frequency"):
                exec_opts.append({
                    "field": "action_frequency",
                    "value": execution_options["action_frequency"],
                    "operator": "EQUAL"
                })
            
            # For NOTIFICATION - user_ids
            if execution_type == "NOTIFICATION" and execution_options.get("user_ids"):
                exec_opts.append({
                    "field": "user_ids",
                    "value": execution_options["user_ids"],
                    "operator": "EQUAL"
                })
            
            # For CHANGE_BUDGET - build change_spec
            if execution_type == "CHANGE_BUDGET":
                change_spec = {}
                if execution_options.get("budget_change_type"):
                    change_spec["change_type"] = execution_options["budget_change_type"]
                if execution_options.get("budget_change_value"):
                    change_spec["change_value"] = execution_options["budget_change_value"]
                if execution_options.get("budget_change_unit"):
                    change_spec["change_unit"] = execution_options["budget_change_unit"]
                if execution_options.get("budget_min"):
                    change_spec["min_value"] = execution_options["budget_min"]
                if execution_options.get("budget_max"):
                    change_spec["max_value"] = execution_options["budget_max"]
                if change_spec:
                    execution_spec["change_spec"] = change_spec
            
            # For CHANGE_BID - build change_spec
            if execution_type == "CHANGE_BID":
                change_spec = {}
                if execution_options.get("bid_change_type"):
                    change_spec["change_type"] = execution_options["bid_change_type"]
                if execution_options.get("bid_change_value"):
                    change_spec["change_value"] = execution_options["bid_change_value"]
                if execution_options.get("bid_change_unit"):
                    change_spec["change_unit"] = execution_options["bid_change_unit"]
                if change_spec:
                    execution_spec["change_spec"] = change_spec
            
            # For REBALANCE_BUDGET - build rebalance_spec
            if execution_type == "REBALANCE_BUDGET":
                if execution_options.get("rebalance_metric"):
                    execution_spec["rebalance_spec"] = {
                        "metric": execution_options["rebalance_metric"]
                    }
            
            # For PING_ENDPOINT - endpoint URL
            if execution_type == "PING_ENDPOINT":
                if execution_options.get("endpoint_url"):
                    execution_spec["endpoint"] = execution_options["endpoint_url"]
            
            if exec_opts:
                execution_spec["execution_options"] = exec_opts
        
        # Schedule spec - per Meta v24.0 docs with full fields
        schedule_spec = None
        if body.get("schedule"):
            schedule = body["schedule"]
            schedule_spec = {
                "schedule_type": schedule.get("schedule_type", "DAILY")
            }
            # Custom schedule with days and time range
            if schedule.get("schedule_type") == "CUSTOM" or schedule.get("start_minute") is not None:
                if schedule.get("start_minute") is not None:
                    schedule_spec["start_minute"] = schedule["start_minute"]
                if schedule.get("end_minute") is not None:
                    schedule_spec["end_minute"] = schedule["end_minute"]
                if schedule.get("days"):
                    schedule_spec["days"] = schedule["days"]
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.create_automation_rule(
            account_id=credentials["account_id"].replace("act_", ""),
            name=name,
            evaluation_spec=evaluation_spec,
            execution_spec=execution_spec,
            schedule_spec=schedule_spec,
            status=body.get("status", "ENABLED"),
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        await log_activity(
            user_id=user_id,
            workspace_id=workspace_id,
            action="create_automation_rule",
            details={"rule_id": result.get("rule_id"), "name": name}
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating automation rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules")
async def list_automation_rules(request: Request):
    """
    GET /api/v1/meta-ads/rules
    
    List all automation rules for the ad account.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_automation_rules(
            account_id=credentials["account_id"].replace("act_", "")
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={"rules": result.get("rules", [])})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing automation rules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/rules/{rule_id}")
async def update_automation_rule(
    request: Request,
    rule_id: str = Path(...)
):
    """
    PATCH /api/v1/meta-ads/rules/{rule_id}
    
    Update an automation rule (e.g., enable/disable).
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        body = await request.json()
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.update_automation_rule(
            rule_id=rule_id,
            updates=body
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating automation rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rules/{rule_id}")
async def delete_automation_rule(
    request: Request,
    rule_id: str = Path(...)
):
    """
    DELETE /api/v1/meta-ads/rules/{rule_id}
    
    Delete an automation rule.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.delete_automation_rule(rule_id=rule_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        await log_activity(
            user_id=user_id,
            workspace_id=workspace_id,
            action="delete_automation_rule",
            details={"rule_id": rule_id}
        )
        
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting automation rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/{rule_id}")
async def get_automation_rule(
    request: Request,
    rule_id: str = Path(...)
):
    """
    GET /api/v1/meta-ads/rules/{rule_id}
    
    Get details of a specific automation rule.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_automation_rule(rule_id=rule_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={"success": True, "rule": result.get("rule")})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting automation rule: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/{rule_id}/history")
async def get_rule_history(
    request: Request,
    rule_id: str = Path(...),
    limit: int = Query(25, ge=1, le=100),
    action: Optional[str] = Query(None, description="Filter by action: PAUSE, UNPAUSE, CHANGE_BUDGET, etc."),
    hide_no_changes: bool = Query(False, description="Exclude entries with no results")
):
    """
    GET /api/v1/meta-ads/rules/{rule_id}/history
    
    Get execution history for an automation rule.
    """
    try:
        user_id, workspace_id = await get_user_context(request)
        credentials = await get_verified_credentials(workspace_id, user_id)
        
        client = create_meta_sdk_client(credentials["access_token"])
        
        result = await client.get_rule_history(
            rule_id=rule_id,
            limit=limit,
            action=action,
            hide_no_changes=hide_no_changes
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return JSONResponse(content={
            "success": True,
            "history": result.get("history", []),
            "paging": result.get("paging")
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting rule history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rules/templates")
async def get_rule_templates(request: Request):
    """
    GET /api/v1/meta-ads/rules/templates
    
    Get pre-built automation rule templates.
    """
    from ....schemas.automation_rules import RULE_TEMPLATES
    
    return JSONResponse(content={"templates": RULE_TEMPLATES})
