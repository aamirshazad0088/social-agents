"""
Storage API Router
File upload and signed URL generation endpoints for Supabase Storage
"""

import base64
import uuid
import mimetypes
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

from src.services.supabase_service import get_supabase_client
from src.services.storage_service import storage_service


router = APIRouter(prefix="/api/v1/storage", tags=["Storage"])


# ================== SCHEMAS ==================

class Base64UploadRequest(BaseModel):
    """Request for base64 file upload"""
    base64_data: str = Field(..., alias="base64Data")
    file_name: str = Field(..., alias="fileName")
    folder: str = "uploads"
    type: str = "image"
    
    class Config:
        populate_by_name = True


class SignedUrlRequest(BaseModel):
    """Request for signed upload URL"""
    file_name: str = Field(..., alias="fileName")
    content_type: Optional[str] = Field(None, alias="contentType")
    folder: str = "uploads"
    
    class Config:
        populate_by_name = True


class UploadResponse(BaseModel):
    """Response from file upload"""
    url: str
    path: str
    message: str = "File uploaded successfully"


class SignedUrlResponse(BaseModel):
    """Response from signed URL generation"""
    signed_url: str = Field(..., alias="signedUrl")
    token: str
    path: str
    public_url: str = Field(..., alias="publicUrl")


# ================== HELPER FUNCTIONS ==================

def generate_unique_filename(original_filename: str, user_id: str, folder: str) -> str:
    """Generate unique file path with user ID and timestamp"""
    file_ext = original_filename.split('.')[-1] if '.' in original_filename else 'bin'
    random_suffix = uuid.uuid4().hex[:7]
    timestamp = int(datetime.now().timestamp() * 1000)
    return f"{folder}/{user_id}/{timestamp}_{random_suffix}.{file_ext}"


def decode_base64_data(base64_data: str) -> tuple[bytes, str]:
    """
    Decode base64 data, handling data URLs and raw base64 strings.
    Returns tuple of (bytes, content_type)
    """
    content_type = "application/octet-stream"
    
    # Handle data URL format: data:image/png;base64,iVBOR...
    if base64_data.startswith("data:"):
        # Extract content type and base64 data
        header, encoded = base64_data.split(",", 1)
        content_type = header.split(":")[1].split(";")[0]
    else:
        encoded = base64_data
    
    # Decode base64
    file_bytes = base64.b64decode(encoded)
    return file_bytes, content_type


# ================== ENDPOINTS ==================

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: Optional[UploadFile] = File(None),
    folder: Optional[str] = Form("uploads"),
    base64_data: Optional[str] = Form(None, alias="base64Data"),
    file_name: Optional[str] = Form(None, alias="fileName"),
):
    """
    Upload a file to Supabase Storage.
    
    Supports two upload methods:
    1. FormData file upload (multipart/form-data) - preferred for large files
    2. Base64 JSON upload (for smaller files or from canvas/generated content)
    """
    try:
        supabase = get_supabase_client()
        
        # For production, you'd get user_id from auth token
        # Here we use a placeholder - in real implementation, use authentication
        user_id = "public"  # Replace with actual user ID from auth
        
        # Handle FormData file upload
        if file and file.filename:
            file_data = await file.read()
            if not file_data:
                raise HTTPException(status_code=400, detail="Empty file provided")
            
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
            file_path = generate_unique_filename(file.filename, user_id, folder or "uploads")
            
            # Upload to Supabase Storage
            supabase.storage.from_("media").upload(
                file_path,
                file_data,
                {"content-type": content_type}
            )
            
            # Get public URL
            public_url = supabase.storage.from_("media").get_public_url(file_path)
            
            return UploadResponse(
                url=public_url,
                path=file_path,
                message="File uploaded successfully"
            )
        
        # Handle Base64 upload
        if base64_data and file_name:
            file_bytes, content_type = decode_base64_data(base64_data)
            file_path = generate_unique_filename(file_name, user_id, folder or "uploads")
            
            # Upload to Supabase Storage
            supabase.storage.from_("media").upload(
                file_path,
                file_bytes,
                {"content-type": content_type}
            )
            
            # Get public URL
            public_url = supabase.storage.from_("media").get_public_url(file_path)
            
            return UploadResponse(
                url=public_url,
                path=file_path,
                message="File uploaded successfully"
            )
        
        raise HTTPException(
            status_code=400,
            detail="Either a file or base64Data with fileName is required"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/upload/json")
async def upload_file_json(request: Base64UploadRequest):
    """
    Upload a file using JSON body with base64 data.
    Alternative to the FormData endpoint for cases where JSON is preferred.
    """
    try:
        supabase = get_supabase_client()
        
        # For production, get user_id from auth token
        user_id = "public"
        
        # Decode base64 data
        file_bytes, content_type = decode_base64_data(request.base64_data)
        file_path = generate_unique_filename(request.file_name, user_id, request.folder)
        
        # Upload to Supabase Storage
        supabase.storage.from_("media").upload(
            file_path,
            file_bytes,
            {"content-type": content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        return {
            "url": public_url,
            "path": file_path,
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.post("/signed-url", response_model=SignedUrlResponse)
async def create_signed_upload_url(request: SignedUrlRequest):
    """
    Generate a signed URL for direct upload to Supabase Storage.
    
    This bypasses API body size limits by allowing direct client-to-storage uploads.
    The signed URL is valid for 1 hour.
    """
    try:
        supabase = get_supabase_client()
        
        # For production, get user_id from auth token
        user_id = "public"
        
        # Generate unique file path
        file_path = generate_unique_filename(request.file_name, user_id, request.folder)
        
        # Create signed upload URL (valid for 1 hour)
        signed_data = supabase.storage.from_("media").create_signed_upload_url(file_path)
        
        if not signed_data or "signedUrl" not in signed_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to create signed URL"
            )
        
        # Get the public URL for after upload completes
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        return SignedUrlResponse(
            signed_url=signed_data["signedUrl"],
            token=signed_data.get("token", ""),
            path=file_path,
            public_url=public_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate signed URL: {str(e)}"
        )


@router.get("/signed-url")
async def get_signed_download_url(
    path: str,
    expires_in: int = 3600
):
    """
    Generate a signed URL for accessing a private file.
    
    Args:
        path: File path within the storage bucket
        expires_in: URL expiration time in seconds (default: 1 hour)
    """
    try:
        result = await storage_service.get_signed_url(path, expires_in)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to generate signed URL")
            )
        
        return {
            "signedUrl": result["signed_url"],
            "expiresIn": expires_in
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate signed URL: {str(e)}"
        )


@router.delete("/file")
async def delete_file(path: str):
    """
    Delete a file from storage.
    
    Args:
        path: File path within the storage bucket
    """
    try:
        result = await storage_service.delete_file(path)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to delete file")
            )
        
        return {"success": True, "message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )


@router.get("/list")
async def list_files(
    folder: str = "",
    limit: int = 100
):
    """
    List files in a folder.
    
    Args:
        folder: Folder path within the storage bucket
        limit: Maximum number of files to return
    """
    try:
        result = await storage_service.list_files(folder, limit=limit)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to list files")
            )
        
        return {
            "files": result.get("files", []),
            "folder": folder
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )


# ================== INFO ENDPOINT ==================

@router.get("/")
async def get_storage_info():
    """Get Storage service information"""
    return {
        "service": "Storage",
        "version": "1.0.0",
        "bucket": "media",
        "endpoints": {
            "upload": {
                "POST": "Upload file (FormData or base64)"
            },
            "upload/json": {
                "POST": "Upload file using JSON body with base64 data"
            },
            "signed-url": {
                "GET": "Get signed URL for private file access",
                "POST": "Create signed URL for direct upload"
            },
            "file": {
                "DELETE": "Delete a file from storage"
            },
            "list": {
                "GET": "List files in a folder"
            }
        },
        "max_file_size": "50MB",
        "supported_methods": ["FormData upload", "Base64 upload", "Signed URL upload"]
    }
