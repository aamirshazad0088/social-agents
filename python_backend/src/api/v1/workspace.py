"""
Workspace API Router
Workspace management, members, invites, activity, and business settings
"""

import re
import secrets
import logging
from typing import Optional, Literal
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr

from src.services.supabase_service import get_supabase_client
from src.config import settings


router = APIRouter(prefix="/api/v1/workspace", tags=["Workspace"])
logger = logging.getLogger(__name__)


# ================== CONFIG ==================

APP_URL = getattr(settings, "APP_URL", "http://localhost:3000")
UUID_REGEX = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)


# ================== SCHEMAS ==================

class UpdateWorkspaceRequest(BaseModel):
    """Request to update workspace settings"""
    name: Optional[str] = None
    description: Optional[str] = None
    max_members: Optional[int] = Field(None, alias="maxMembers", ge=1, le=100)
    
    class Config:
        populate_by_name = True


class CreateInviteRequest(BaseModel):
    """Request to create a workspace invitation"""
    email: Optional[EmailStr] = None
    role: Literal["admin", "editor", "viewer"] = "editor"
    expires_in_days: int = Field(7, alias="expiresInDays", ge=1, le=365)
    
    class Config:
        populate_by_name = True


class AcceptInviteRequest(BaseModel):
    """Request to accept an invitation"""
    token: str


class BusinessSettingsRequest(BaseModel):
    """Request to update business settings"""
    business_name: str = Field(..., alias="businessName")
    industry: str
    description: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = Field(None, alias="contactEmail")
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = Field(None, alias="logoUrl")
    social_links: Optional[dict] = Field(None, alias="socialLinks")
    tone_of_voice: Optional[str] = Field(None, alias="toneOfVoice")
    target_audience: Optional[str] = Field(None, alias="targetAudience")
    brand_colors: Optional[list[str]] = Field(None, alias="brandColors")
    
    class Config:
        populate_by_name = True


# ================== HELPER FUNCTIONS ==================

def generate_invite_token() -> str:
    """Generate a secure random invite token."""
    return secrets.token_urlsafe(32)


async def get_user_workspace_role(user_id: str) -> tuple[str, str]:
    """
    Get user's workspace ID and role.
    Returns (workspace_id, role) tuple.
    """
    supabase = get_supabase_client()
    
    result = supabase.table("users").select(
        "workspace_id, role"
    ).eq("id", user_id).single().execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return result.data.get("workspace_id"), result.data.get("role", "viewer")


def require_admin(role: str) -> None:
    """Raise 403 if user is not an admin."""
    if role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only admins can perform this action"
        )


# ================== WORKSPACE ENDPOINTS ==================

@router.get("/")
async def get_workspace(user_id: str):
    """
    GET /api/v1/workspace
    Get current workspace details.
    """
    try:
        workspace_id, _ = await get_user_workspace_role(user_id)
        
        if not workspace_id:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        supabase = get_supabase_client()
        result = supabase.table("workspaces").select("*").eq(
            "id", workspace_id
        ).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        return {"data": result.data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace: {e}")
        raise HTTPException(status_code=500, detail="Failed to get workspace")


@router.patch("/")
async def update_workspace(user_id: str, request: UpdateWorkspaceRequest):
    """
    PATCH /api/v1/workspace
    Update workspace settings (admin only).
    """
    try:
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Build update data
        update_data = {"updated_at": datetime.now().isoformat()}
        if request.name:
            update_data["name"] = request.name
        if request.description is not None:
            update_data["description"] = request.description
        if request.max_members:
            update_data["max_members"] = request.max_members
        
        result = supabase.table("workspaces").update(update_data).eq(
            "id", workspace_id
        ).execute()
        
        return {"data": result.data[0] if result.data else None}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workspace: {e}")
        raise HTTPException(status_code=500, detail="Failed to update workspace")


@router.delete("/")
async def delete_workspace(user_id: str):
    """
    DELETE /api/v1/workspace
    Delete/deactivate workspace (admin only).
    """
    try:
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Soft delete - mark as inactive
        supabase.table("workspaces").update({
            "is_active": False,
            "deleted_at": datetime.now().isoformat()
        }).eq("id", workspace_id).execute()
        
        return {"message": "Workspace deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspace: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete workspace")


# ================== MEMBERS ENDPOINTS ==================

@router.get("/members")
async def get_members(
    user_id: str,
    role: Optional[Literal["admin", "editor", "viewer"]] = None
):
    """
    GET /api/v1/workspace/members
    Get all members in the workspace.
    """
    try:
        workspace_id, _ = await get_user_workspace_role(user_id)
        
        supabase = get_supabase_client()
        
        query = supabase.table("users").select(
            "id, email, full_name, role, avatar_url, created_at"
        ).eq("workspace_id", workspace_id)
        
        if role:
            query = query.eq("role", role)
        
        result = query.execute()
        
        return {"data": result.data or []}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting members: {e}")
        raise HTTPException(status_code=500, detail="Failed to get members")


@router.delete("/members/{member_id}")
async def remove_member(user_id: str, member_id: str):
    """
    DELETE /api/v1/workspace/members/{member_id}
    Remove a member from the workspace (admin only).
    """
    try:
        # Validate UUID format
        if not UUID_REGEX.match(member_id):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        # Can't remove yourself
        if member_id == user_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove yourself from the workspace"
            )
        
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Remove member by setting workspace_id to null
        supabase.table("users").update({
            "workspace_id": None,
            "role": "viewer"
        }).eq("id", member_id).eq("workspace_id", workspace_id).execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing member: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove member")


# ================== INVITES ENDPOINTS ==================

@router.get("/invites")
async def get_invites(user_id: str):
    """
    GET /api/v1/workspace/invites
    Get all pending invitations (admin only).
    """
    try:
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        result = supabase.table("workspace_invites").select("*").eq(
            "workspace_id", workspace_id
        ).eq("status", "pending").gte(
            "expires_at", datetime.now().isoformat()
        ).order("created_at", desc=True).execute()
        
        return {"data": result.data or []}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invites: {e}")
        raise HTTPException(status_code=500, detail="Failed to get invites")


@router.post("/invites")
async def create_invite(user_id: str, request: CreateInviteRequest):
    """
    POST /api/v1/workspace/invites
    Create a new invitation (admin only).
    """
    try:
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Check if workspace is full
        members_result = supabase.table("users").select(
            "id", count="exact"
        ).eq("workspace_id", workspace_id).execute()
        
        workspace_result = supabase.table("workspaces").select(
            "max_members"
        ).eq("id", workspace_id).single().execute()
        
        max_members = workspace_result.data.get("max_members", 10) if workspace_result.data else 10
        current_members = members_result.count or 0
        
        if current_members >= max_members:
            raise HTTPException(
                status_code=400,
                detail="Workspace is at maximum capacity"
            )
        
        # Generate invite token
        token = generate_invite_token()
        expires_at = datetime.now() + timedelta(days=request.expires_in_days)
        
        # Create invite
        invite_data = {
            "workspace_id": workspace_id,
            "email": request.email,
            "role": request.role,
            "token": token,
            "created_by": user_id,
            "status": "pending",
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        result = supabase.table("workspace_invites").insert(invite_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        invite = result.data[0]
        invite_url = f"{APP_URL}/invite/{token}"
        
        return {
            "data": {
                "invite": invite,
                "inviteUrl": invite_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to create invitation")


@router.delete("/invites")
async def revoke_invite(user_id: str, invite_id: str):
    """
    DELETE /api/v1/workspace/invites
    Revoke an invitation (admin only).
    """
    try:
        if not invite_id:
            raise HTTPException(status_code=400, detail="Missing inviteId parameter")
        
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Update invite status to revoked
        supabase.table("workspace_invites").update({
            "status": "revoked",
            "updated_at": datetime.now().isoformat()
        }).eq("id", invite_id).eq("workspace_id", workspace_id).execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke invitation")


@router.post("/invites/accept")
async def accept_invite(user_id: str, request: AcceptInviteRequest):
    """
    POST /api/v1/workspace/invites/accept
    Accept an invitation and join the workspace.
    """
    try:
        supabase = get_supabase_client()
        
        # Find the invite
        invite_result = supabase.table("workspace_invites").select("*").eq(
            "token", request.token
        ).eq("status", "pending").single().execute()
        
        if not invite_result.data:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired invitation"
            )
        
        invite = invite_result.data
        
        # Check if expired
        expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.now(expires_at.tzinfo):
            raise HTTPException(
                status_code=400,
                detail="This invitation has expired"
            )
        
        # Update user's workspace and role
        supabase.table("users").update({
            "workspace_id": invite["workspace_id"],
            "role": invite["role"],
            "updated_at": datetime.now().isoformat()
        }).eq("id", user_id).execute()
        
        # Mark invite as accepted
        supabase.table("workspace_invites").update({
            "status": "accepted",
            "accepted_by": user_id,
            "accepted_at": datetime.now().isoformat()
        }).eq("id", invite["id"]).execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept invitation")


@router.get("/invites/{token}")
async def get_invite_by_token(token: str):
    """
    GET /api/v1/workspace/invites/{token}
    Get invitation details by token (public endpoint for invite preview).
    """
    try:
        supabase = get_supabase_client()
        
        result = supabase.table("workspace_invites").select(
            "id, role, email, expires_at, status, workspace_id"
        ).eq("token", token).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        invite = result.data
        
        # Get workspace name
        workspace_result = supabase.table("workspaces").select(
            "name"
        ).eq("id", invite["workspace_id"]).single().execute()
        
        invite["workspace_name"] = workspace_result.data.get("name") if workspace_result.data else "Unknown"
        
        # Check if valid
        is_valid = invite["status"] == "pending"
        if is_valid:
            expires_at = datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00"))
            is_valid = expires_at > datetime.now(expires_at.tzinfo)
        
        return {
            "data": invite,
            "isValid": is_valid
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting invite: {e}")
        raise HTTPException(status_code=500, detail="Failed to get invitation")


# ================== ACTIVITY ENDPOINTS ==================

@router.get("/activity")
async def get_activity_log(
    user_id: str,
    filter_user_id: Optional[str] = Query(None, alias="userId"),
    action: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    GET /api/v1/workspace/activity
    Get activity/audit log for the workspace (admin only).
    """
    try:
        workspace_id, role = await get_user_workspace_role(user_id)
        require_admin(role)
        
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("audit_logs").select(
            "*, users(email, full_name)", count="exact"
        ).eq("workspace_id", workspace_id)
        
        if filter_user_id:
            query = query.eq("user_id", filter_user_id)
        if action:
            query = query.eq("action", action)
        if start_date:
            query = query.gte("created_at", start_date)
        if end_date:
            query = query.lte("created_at", end_date)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Format response
        activities = []
        for log in result.data or []:
            activities.append({
                "id": log.get("id"),
                "workspace_id": log.get("workspace_id"),
                "user_id": log.get("user_id"),
                "user_email": log.get("users", {}).get("email", "Unknown"),
                "user_name": log.get("users", {}).get("full_name"),
                "action": log.get("action"),
                "entity_type": log.get("resource_type"),
                "entity_id": log.get("resource_id"),
                "details": log.get("details"),
                "created_at": log.get("created_at")
            })
        
        total = result.count or 0
        
        return {
            "data": activities,
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": offset + limit < total
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting activity log: {e}")
        raise HTTPException(status_code=500, detail="Failed to get activity log")


# ================== BUSINESS SETTINGS ENDPOINTS ==================

@router.get("/business-settings")
async def get_business_settings(user_id: str):
    """
    GET /api/v1/workspace/business-settings
    Get business settings for the workspace.
    """
    try:
        workspace_id, _ = await get_user_workspace_role(user_id)
        
        supabase = get_supabase_client()
        
        result = supabase.table("business_settings").select("*").eq(
            "workspace_id", workspace_id
        ).single().execute()
        
        return {
            "success": True,
            "data": result.data  # May be None if not set
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Not found is OK - return null
        if "PGRST116" in str(e):  # No rows returned
            return {"success": True, "data": None}
        logger.error(f"Error getting business settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get business settings")


@router.put("/business-settings")
async def update_business_settings(user_id: str, request: BusinessSettingsRequest):
    """
    PUT /api/v1/workspace/business-settings
    Update business settings for the workspace.
    """
    try:
        workspace_id, _ = await get_user_workspace_role(user_id)
        
        supabase = get_supabase_client()
        
        settings_data = {
            "workspace_id": workspace_id,
            "business_name": request.business_name,
            "industry": request.industry,
            "description": request.description,
            "website": request.website,
            "contact_email": request.contact_email,
            "phone": request.phone,
            "address": request.address,
            "logo_url": request.logo_url,
            "social_links": request.social_links,
            "tone_of_voice": request.tone_of_voice,
            "target_audience": request.target_audience,
            "brand_colors": request.brand_colors,
            "updated_at": datetime.now().isoformat(),
            "updated_by": user_id
        }
        
        # Upsert settings
        result = supabase.table("business_settings").upsert(
            settings_data,
            on_conflict="workspace_id"
        ).execute()
        
        return {
            "success": True,
            "data": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating business settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save business settings")


@router.delete("/business-settings")
async def clear_business_settings(user_id: str):
    """
    DELETE /api/v1/workspace/business-settings
    Clear business settings for the workspace.
    """
    try:
        workspace_id, _ = await get_user_workspace_role(user_id)
        
        supabase = get_supabase_client()
        
        supabase.table("business_settings").delete().eq(
            "workspace_id", workspace_id
        ).execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing business settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear business settings")


# ================== INFO ENDPOINT ==================

@router.get("/info")
async def get_workspace_api_info():
    """Get Workspace API service information"""
    return {
        "service": "Workspace",
        "version": "1.0.0",
        "endpoints": {
            "/": {
                "GET": "Get workspace details",
                "PATCH": "Update workspace (admin)",
                "DELETE": "Delete workspace (admin)"
            },
            "/members": {
                "GET": "List workspace members"
            },
            "/members/{userId}": {
                "DELETE": "Remove member (admin)"
            },
            "/invites": {
                "GET": "List pending invites (admin)",
                "POST": "Create invitation (admin)",
                "DELETE": "Revoke invitation (admin)"
            },
            "/invites/accept": {
                "POST": "Accept invitation"
            },
            "/invites/{token}": {
                "GET": "Get invite by token (public)"
            },
            "/activity": {
                "GET": "Get activity log (admin)"
            },
            "/business-settings": {
                "GET": "Get business settings",
                "PUT": "Update business settings",
                "DELETE": "Clear business settings"
            }
        },
        "roles": ["admin", "editor", "viewer"]
    }
