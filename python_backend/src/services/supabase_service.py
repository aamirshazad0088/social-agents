"""
Supabase Service
Production implementation for Supabase storage and database
"""
import logging
import base64
import uuid
import mimetypes
import re
from typing import Optional, Dict, Any, List
from datetime import datetime

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

from ..config import settings

logger = logging.getLogger(__name__)

# Lazy client initialization
_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create Supabase client (Anon)"""
    global _supabase_client
    
    if _supabase_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be configured")
        
        _supabase_client = create_client(
            url, 
            key,
            options=ClientOptions(
                auto_refresh_token=True,
                persist_session=False
            )
        )
        logger.info("Supabase client initialized")
    
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """Get or create Supabase admin client (Service Role) - Bypasses RLS"""
    global _supabase_admin_client
    
    if _supabase_admin_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured")
        
        _supabase_admin_client = create_client(
            url, 
            key,
            options=ClientOptions(
                auto_refresh_token=False,
                persist_session=False
            )
        )
        logger.info("Supabase admin client initialized")
    
    return _supabase_admin_client


def is_supabase_configured() -> bool:
    """Check if Supabase is configured"""
    return bool(settings.SUPABASE_URL and settings.SUPABASE_KEY)


# ============================================================================
# Storage Operations
# ============================================================================

async def upload_file(
    bucket: str,
    file_data: bytes,
    file_name: Optional[str] = None,
    content_type: Optional[str] = None,
    folder: Optional[str] = None,
) -> Dict[str, Any]:
    """Upload file to Supabase Storage"""
    try:
        client = get_supabase_admin_client() # Use admin for backend uploads
        
        if not file_name:
            ext = mimetypes.guess_extension(content_type or "application/octet-stream") or ""
            file_name = f"{uuid.uuid4()}{ext}"
        
        full_path = f"{folder}/{file_name}" if folder else file_name
        
        client.storage.from_(bucket).upload(
            path=full_path,
            file=file_data,
            file_options={
                "content-type": content_type or "application/octet-stream",
                "upsert": "true"
            }
        )
        
        public_url = client.storage.from_(bucket).get_public_url(full_path)
        
        return {
            "success": True,
            "path": full_path,
            "publicUrl": public_url,
        }
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return {"success": False, "error": str(e)}


async def upload_base64_file(
    base64_data: str,
    file_name: str,
    bucket: str = "media",
    folder: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload base64 data to Supabase Storage
    Matches Next.js uploadBase64Image behavior
    """
    try:
        # Match data:mime;base64,content
        match = re.match(r'^data:(.+);base64,(.+)$', base64_data)
        if not match:
            return {"success": False, "error": "Invalid base64 format"}
        
        mime_type = match.group(1)
        base64_content = match.group(2)
        
        file_data = base64.b64decode(base64_content)
        
        # Clean file name and add extension if missing
        extension = mimetypes.guess_extension(mime_type) or ""
        if not file_name.endswith(extension):
            file_name = f"{file_name}{extension}"
        
        # Add timestamp to name like Next.js
        timestamp = int(datetime.now().timestamp() * 1000)
        final_name = f"{timestamp}-{file_name}"
        
        return await upload_file(
            bucket=bucket,
            file_data=file_data,
            file_name=final_name,
            content_type=mime_type,
            folder=folder
        )
    except Exception as e:
        logger.error(f"Base64 upload error: {e}")
        return {"success": False, "error": str(e)}


async def download_file(bucket: str, path: str) -> Dict[str, Any]:
    """Download file from Supabase Storage"""
    try:
        client = get_supabase_admin_client()
        result = client.storage.from_(bucket).download(path)
        return {
            "success": True,
            "data": result,
            "base64": base64.b64encode(result).decode("utf-8")
        }
    except Exception as e:
        logger.error(f"Download error: {e}")
        return {"success": False, "error": str(e)}


async def delete_file(bucket: str, paths: List[str]) -> Dict[str, Any]:
    """Delete files from Supabase Storage"""
    try:
        client = get_supabase_admin_client()
        client.storage.from_(bucket).remove(paths)
        return {"success": True, "deleted": paths}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# Database Operations (using Admin Client to bypass RLS)
# ============================================================================

async def db_select(
    table: str,
    columns: str = "*",
    filters: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = None,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """Select data from Supabase table"""
    try:
        client = get_supabase_admin_client()
        query = client.table(table).select(columns)
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        if limit:
            query = query.limit(limit)
        if order_by:
            query = query.order(order_by)
        result = query.execute()
        return {"success": True, "data": result.data, "count": len(result.data)}
    except Exception as e:
        logger.error(f"Select error: {e}")
        return {"success": False, "error": str(e)}


async def db_insert(table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Insert data into Supabase table"""
    try:
        client = get_supabase_admin_client()
        result = client.table(table).insert(data).execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        logger.error(f"Insert error: {e}")
        return {"success": False, "error": str(e)}


async def db_update(table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
    """Update data in Supabase table"""
    try:
        client = get_supabase_admin_client()
        query = client.table(table).update(data)
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.execute()
        return {"success": True, "data": result.data}
    except Exception as e:
        logger.error(f"Update error: {e}")
        return {"success": False, "error": str(e)}


async def db_delete(table: str, filters: Dict[str, Any]) -> Dict[str, Any]:
    """Delete data from Supabase table"""
    try:
        client = get_supabase_admin_client()
        query = client.table(table).delete()
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.execute()
        return {"success": True, "deleted": result.data}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        return {"success": False, "error": str(e)}


# ============================================================================
# Core Domain Helpers (Aligned with Next.js Schema)
# ============================================================================

async def log_activity(
    workspace_id: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """Log activity to activity_logs table matching Next.js behavior"""
    data = {
        "workspace_id": workspace_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "user_id": user_id,
        "old_values": old_values,
        "new_values": new_values,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.now().isoformat()
    }
    return await db_insert("activity_logs", data)


async def register_media_asset(
    workspace_id: str,
    name: str,
    file_url: str,
    type: str, # 'image' | 'video'
    source: str = "ai-generated",
    file_size: Optional[int] = None,
    created_by: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Register a new media asset in the media_assets table"""
    data = {
        "workspace_id": workspace_id,
        "name": name,
        "description": description,
        "type": type,
        "source": source,
        "file_url": file_url,
        "file_size": file_size,
        "tags": tags or [],
        "created_by": created_by,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    return await db_insert("media_assets", data)


# ============================================================================
# Auth Operations
# ============================================================================

async def verify_jwt(token: str) -> Dict[str, Any]:
    """
    Verify JWT token and fetch user profile (workspace_id, role)
    Matches Next.js createRequestContext behavior
    """
    try:
        client = get_supabase_client()
        user_resp = client.auth.get_user(token)
        
        if user_resp and user_resp.user:
            user_id = user_resp.user.id
            
            # Fetch profile from users table using admin client to bypass RLS
            admin = get_supabase_admin_client()
            profile_resp = admin.table("users").select("workspace_id, role, is_active").eq("id", user_id).single().execute()
            
            if profile_resp.data:
                profile = profile_resp.data
                return {
                    "success": True,
                    "user": {
                        "id": user_id,
                        "email": user_resp.user.email,
                        "workspaceId": profile.get("workspace_id"),
                        "role": profile.get("role", "viewer"),
                        "isActive": profile.get("is_active", True)
                    }
                }
            
            # Fallback for users without profile record
            return {
                "success": True,
                "user": {
                    "id": user_id,
                    "email": user_resp.user.email,
                    "workspaceId": None,
                    "role": "viewer",
                    "isActive": True
                }
            }
        
        return {"success": False, "error": "Invalid token"}
        
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
        return {"success": False, "error": str(e)}
