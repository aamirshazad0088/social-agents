"""
Content Calendar API - Routes
CRUD endpoints for managing calendar entries.
"""
import logging
from datetime import date, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from ...schemas.calendar import (
    CalendarEntry,
    CalendarEntryCreate,
    CalendarEntryUpdate,
    CalendarWeekView,
    CalendarMonthView,
    CONTENT_TYPE_COLORS,
)
from ...services.supabase_service import get_supabase_admin_client, verify_jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])


async def get_workspace_id(request: Request) -> tuple[str, str]:
    """Extract workspace_id and user_id from authenticated user."""
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = auth_header.split(" ", 1)[1]
    jwt_result = await verify_jwt(token)
    
    if not jwt_result.get("success") or not jwt_result.get("user"):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = jwt_result["user"]
    workspace_id = user.get("workspaceId")
    user_id = user.get("id")
    
    if not workspace_id:
        raise HTTPException(status_code=400, detail="No workspace found")
    
    return workspace_id, user_id


@router.get("", response_model=List[CalendarEntry])
async def list_calendar_entries(
    request: Request,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    platform: Optional[str] = None,
    content_type: Optional[str] = None,
    status: Optional[str] = None,
):
    """List calendar entries with optional filters."""
    try:
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        query = supabase.table("content_calendar_entries").select("*").eq("workspace_id", workspace_id)
        
        if start_date:
            query = query.gte("scheduled_date", start_date.isoformat())
        if end_date:
            query = query.lte("scheduled_date", end_date.isoformat())
        if platform:
            query = query.eq("platform", platform)
        if content_type:
            query = query.eq("content_type", content_type)
        if status:
            query = query.eq("status", status)
        
        query = query.order("scheduled_date", desc=False)
        result = query.execute()
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing calendar entries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=CalendarEntry)
async def create_calendar_entry(
    request: Request,
    entry: CalendarEntryCreate,
):
    """Create a new calendar entry."""
    try:
        workspace_id, user_id = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        entry_data = entry.model_dump()
        entry_data["id"] = str(uuid4())
        entry_data["workspace_id"] = workspace_id
        entry_data["created_by"] = user_id
        entry_data["color"] = CONTENT_TYPE_COLORS.get(entry.content_type, "#6B7280")
        entry_data["scheduled_date"] = entry_data["scheduled_date"].isoformat()
        if entry_data.get("scheduled_time"):
            entry_data["scheduled_time"] = entry_data["scheduled_time"].isoformat()
        
        result = supabase.table("content_calendar_entries").insert(entry_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create entry")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating calendar entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{entry_id}", response_model=CalendarEntry)
async def get_calendar_entry(
    request: Request,
    entry_id: str,
):
    """Get a single calendar entry."""
    try:
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        result = supabase.table("content_calendar_entries")\
            .select("*")\
            .eq("id", entry_id)\
            .eq("workspace_id", workspace_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting calendar entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{entry_id}", response_model=CalendarEntry)
async def update_calendar_entry(
    request: Request,
    entry_id: str,
    update: CalendarEntryUpdate,
):
    """Update a calendar entry."""
    try:
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update color if content type changed
        if "content_type" in update_data:
            update_data["color"] = CONTENT_TYPE_COLORS.get(update_data["content_type"], "#6B7280")
        
        # Convert date/time to string
        if "scheduled_date" in update_data:
            update_data["scheduled_date"] = update_data["scheduled_date"].isoformat()
        if "scheduled_time" in update_data:
            update_data["scheduled_time"] = update_data["scheduled_time"].isoformat()
        
        result = supabase.table("content_calendar_entries")\
            .update(update_data)\
            .eq("id", entry_id)\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating calendar entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{entry_id}")
async def delete_calendar_entry(
    request: Request,
    entry_id: str,
):
    """Delete a calendar entry."""
    try:
        auth_header = request.headers.get("authorization")
        logger.info(f"Delete request for entry {entry_id}, auth header present: {bool(auth_header)}")
        
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        supabase.table("content_calendar_entries")\
            .delete()\
            .eq("id", entry_id)\
            .eq("workspace_id", workspace_id)\
            .execute()
        
        return {"success": True, "deleted_id": entry_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting calendar entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/week/{week_date}", response_model=CalendarWeekView)
async def get_week_view(
    request: Request,
    week_date: date,
):
    """Get calendar entries for a specific week."""
    try:
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        # Calculate week start (Monday) and end (Sunday)
        week_start = week_date - timedelta(days=week_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        result = supabase.table("content_calendar_entries")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .gte("scheduled_date", week_start.isoformat())\
            .lte("scheduled_date", week_end.isoformat())\
            .order("scheduled_date")\
            .execute()
        
        return {
            "week_start": week_start,
            "week_end": week_end,
            "entries": result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting week view: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/month/{year}/{month}", response_model=CalendarMonthView)
async def get_month_view(
    request: Request,
    year: int,
    month: int,
):
    """Get calendar entries for a specific month."""
    try:
        from calendar import monthrange
        
        workspace_id, _ = await get_workspace_id(request)
        supabase = get_supabase_admin_client()
        
        _, last_day = monthrange(year, month)
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        
        result = supabase.table("content_calendar_entries")\
            .select("*")\
            .eq("workspace_id", workspace_id)\
            .gte("scheduled_date", month_start.isoformat())\
            .lte("scheduled_date", month_end.isoformat())\
            .order("scheduled_date")\
            .execute()
        
        return {
            "year": year,
            "month": month,
            "entries": result.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting month view: {e}")
        raise HTTPException(status_code=500, detail=str(e))
