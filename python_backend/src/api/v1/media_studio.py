"""
Media Studio API Router
Image, Video, and Audio processing endpoints
"""

from typing import Optional, Literal
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from src.services.media_studio import ImageService, VideoService, AudioService
from src.services.supabase_service import get_supabase_client


router = APIRouter(prefix="/api/v1/media-studio", tags=["Media Studio"])


# ================== SCHEMAS ==================

class ImageResizeRequest(BaseModel):
    """Request to resize an image for a platform"""
    workspace_id: str = Field(..., alias="workspaceId")
    image_url: str = Field(..., alias="imageUrl")
    platform: Optional[str] = None
    custom_width: Optional[int] = Field(None, alias="customWidth")
    custom_height: Optional[int] = Field(None, alias="customHeight")
    
    class Config:
        populate_by_name = True


class ImageResizeResponse(BaseModel):
    """Response from image resize operation"""
    success: bool
    url: str
    platform: str
    dimensions: dict
    format: str
    file_size: int
    media_item: Optional[dict] = Field(None, alias="mediaItem")


class VideoResizeRequest(BaseModel):
    """Request to resize a video for a platform"""
    workspace_id: str = Field(..., alias="workspaceId")
    video_url: str = Field(..., alias="videoUrl")
    platform: Optional[str] = None
    custom_width: Optional[int] = Field(None, alias="customWidth")
    custom_height: Optional[int] = Field(None, alias="customHeight")
    
    class Config:
        populate_by_name = True


class VideoResizeResponse(BaseModel):
    """Response from video resize operation"""
    success: bool
    url: str
    platform: str
    dimensions: dict
    duration: float
    media_item: Optional[dict] = Field(None, alias="mediaItem")


class MergeConfig(BaseModel):
    """Configuration for video merge"""
    resolution: Literal["original", "720p", "1080p"] = "720p"
    quality: Literal["draft", "high"] = "draft"


class VideoMergeRequest(BaseModel):
    """Request to merge multiple videos"""
    workspace_id: str = Field(..., alias="workspaceId")
    video_urls: list[str] = Field(..., alias="videoUrls", min_length=2)
    title: Optional[str] = None
    config: Optional[MergeConfig] = None
    
    class Config:
        populate_by_name = True


class VideoMergeResponse(BaseModel):
    """Response from video merge operation"""
    success: bool
    url: str
    clip_count: int = Field(..., alias="clipCount")
    total_duration: float = Field(..., alias="totalDuration")
    is_vertical: bool = Field(..., alias="isVertical")
    media_item: Optional[dict] = Field(None, alias="mediaItem")


class AudioProcessRequest(BaseModel):
    """Request to process video audio"""
    workspace_id: str = Field(..., alias="workspaceId")
    video_url: str = Field(..., alias="videoUrl")
    mute_original: bool = Field(False, alias="muteOriginal")
    background_music_url: Optional[str] = Field(None, alias="backgroundMusicUrl")
    background_music_name: Optional[str] = Field(None, alias="backgroundMusicName")
    original_volume: int = Field(100, alias="originalVolume", ge=0, le=200)
    music_volume: int = Field(80, alias="musicVolume", ge=0, le=200)
    
    class Config:
        populate_by_name = True


class AudioProcessResponse(BaseModel):
    """Response from audio process operation"""
    success: bool
    url: str
    media_item: Optional[dict] = Field(None, alias="mediaItem")


class MediaLibraryFilters(BaseModel):
    """Filters for media library queries"""
    type: Optional[str] = None
    source: Optional[str] = None
    is_favorite: bool = False
    folder: Optional[str] = None
    search: Optional[str] = None
    tags: Optional[list[str]] = None
    limit: int = 50
    offset: int = 0


class CreateMediaItemRequest(BaseModel):
    """Request to create a media item"""
    workspace_id: str = Field(..., alias="workspaceId")
    media_item: dict = Field(..., alias="mediaItem")
    
    class Config:
        populate_by_name = True


class UpdateMediaItemRequest(BaseModel):
    """Request to update a media item"""
    workspace_id: str = Field(..., alias="workspaceId")
    media_id: str = Field(..., alias="mediaId")
    updates: dict
    
    class Config:
        populate_by_name = True


# ================== IMAGE ENDPOINTS ==================

@router.get("/resize-image")
async def get_image_presets():
    """Get available image resize platform presets"""
    return {"presets": ImageService.get_presets()}


@router.post("/resize-image", response_model=ImageResizeResponse)
async def resize_image(request: ImageResizeRequest):
    """Resize image for a specific platform or custom dimensions"""
    # Validate input first (before try block)
    if not request.platform and not (request.custom_width and request.custom_height):
        raise HTTPException(
            status_code=400,
            detail="Either platform or custom dimensions required"
        )
    
    try:
        # Resize image
        result, platform_name = await ImageService.resize_for_platform(
            image_url=request.image_url,
            platform=request.platform,
            custom_width=request.custom_width,
            custom_height=request.custom_height
        )
        
        # Upload to Supabase storage
        supabase = get_supabase_client()
        
        timestamp = int(datetime.now().timestamp() * 1000)
        extension = "jpg" if result.format == "jpeg" else "png"
        content_type = "image/jpeg" if result.format == "jpeg" else "image/png"
        platform_slug = request.platform or "custom"
        file_name = f"resized-{platform_slug}-{timestamp}.{extension}"
        file_path = f"resized/{file_name}"
        
        upload_response = supabase.storage.from_("media").upload(
            file_path,
            result.buffer,
            {"content-type": content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        # Create media library entry
        media_item = {
            "type": "image",
            "source": "edited",
            "url": public_url,
            "prompt": f"Resized for {platform_name}",
            "model": "image-resize",
            "config": {
                "sourceImage": request.image_url,
                "platform": platform_slug,
                "targetWidth": result.width,
                "targetHeight": result.height,
                "format": result.format,
                "originalWidth": result.original_width,
                "originalHeight": result.original_height,
                "resizedAt": datetime.now().isoformat(),
            },
            "metadata": {
                "source": "image-editor",
                "platform": platform_name,
                "dimensions": f"{result.width}x{result.height}",
                "width": result.width,
                "height": result.height,
                "format": result.format,
                "fileSize": result.file_size,
            },
            "tags": ["resized", "image-editor", platform_slug],
        }
        
        return ImageResizeResponse(
            success=True,
            url=public_url,
            platform=platform_name,
            dimensions={"width": result.width, "height": result.height},
            format=result.format,
            file_size=result.file_size,
            media_item=media_item
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        error_message = str(e)
        user_message = "Failed to resize image"
        error_code = "RESIZE_ERROR"
        
        if "download" in error_message.lower():
            user_message = "Could not download the image. Please check the URL is accessible."
            error_code = "DOWNLOAD_FAILED"
        elif "format" in error_message.lower() or "corrupt" in error_message.lower():
            user_message = "Unsupported image format or corrupted file."
            error_code = "INVALID_IMAGE"
        
        raise HTTPException(
            status_code=500,
            detail={"error": user_message, "code": error_code}
        )


# ================== VIDEO ENDPOINTS ==================

@router.get("/resize-video")
async def get_video_presets():
    """Get available video resize platform presets"""
    return {"presets": VideoService.get_presets()}


@router.post("/resize-video", response_model=VideoResizeResponse)
async def resize_video(request: VideoResizeRequest):
    """Resize video for a specific platform or custom dimensions"""
    # Validate input first (before try block)
    if not request.platform and not (request.custom_width and request.custom_height):
        raise HTTPException(
            status_code=400,
            detail="Either platform or custom dimensions required"
        )
    
    try:
        result, platform_name = await VideoService.resize_for_platform(
            video_url=request.video_url,
            platform=request.platform,
            custom_width=request.custom_width,
            custom_height=request.custom_height
        )
        
        # Upload to Supabase storage
        supabase = get_supabase_client()
        
        timestamp = int(datetime.now().timestamp() * 1000)
        platform_slug = request.platform or "custom"
        file_name = f"resized-{platform_slug}-{timestamp}.mp4"
        file_path = f"resized/{file_name}"
        
        supabase.storage.from_("media").upload(
            file_path,
            result.buffer,
            {"content-type": "video/mp4"}
        )
        
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        media_item = {
            "type": "video",
            "source": "edited",
            "url": public_url,
            "prompt": f"Resized for {platform_name}",
            "model": "video-resize",
            "config": {
                "sourceVideo": request.video_url,
                "platform": platform_slug,
                "targetWidth": result.width,
                "targetHeight": result.height,
                "duration": result.duration,
                "resizedAt": datetime.now().isoformat(),
            },
            "metadata": {
                "source": "video-editor",
                "platform": platform_name,
                "dimensions": f"{result.width}x{result.height}",
                "width": result.width,
                "height": result.height,
                "duration": result.duration,
            },
            "tags": ["resized", "video-editor", platform_slug],
        }
        
        return VideoResizeResponse(
            success=True,
            url=public_url,
            platform=platform_name,
            dimensions={"width": result.width, "height": result.height},
            duration=result.duration,
            media_item=media_item
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_message = str(e)
        user_message = "Failed to resize video"
        error_code = "RESIZE_ERROR"
        
        if "timed out" in error_message.lower():
            user_message = "Video processing timed out. Try with a shorter video."
            error_code = "TIMEOUT"
        elif "download" in error_message.lower():
            user_message = "Could not download the video. Please check the URL."
            error_code = "DOWNLOAD_FAILED"
        elif "ffmpeg" in error_message.lower():
            user_message = "Video processing failed. The file may be corrupted or unsupported."
            error_code = "PROCESSING_ERROR"
        
        raise HTTPException(
            status_code=500,
            detail={"error": user_message, "code": error_code}
        )


@router.post("/merge-videos", response_model=VideoMergeResponse)
async def merge_videos(request: VideoMergeRequest):
    """Merge multiple videos into one"""
    try:
        config = request.config or MergeConfig()
        
        result = await VideoService.merge_videos(
            video_urls=request.video_urls,
            resolution=config.resolution,
            quality=config.quality
        )
        
        # Upload to Supabase storage
        supabase = get_supabase_client()
        
        timestamp = int(datetime.now().timestamp() * 1000)
        file_name = f"merged-video-{timestamp}.mp4"
        file_path = f"merged/{file_name}"
        
        supabase.storage.from_("media").upload(
            file_path,
            result.buffer,
            {"content-type": "video/mp4"}
        )
        
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        tags = ["merged", "video-editor", "edited"]
        if result.is_vertical:
            tags.extend(["shorts", "vertical"])
        
        media_item = {
            "type": "video",
            "source": "edited",
            "url": public_url,
            "prompt": request.title or f"Merged video ({len(request.video_urls)} clips)",
            "model": "video-merge",
            "config": {
                "sourceVideos": request.video_urls,
                "mergedAt": datetime.now().isoformat(),
                "videoCount": len(request.video_urls),
                "resolution": f"{result.output_width}x{result.output_height}",
                "quality": config.quality,
                "isVertical": result.is_vertical,
                "totalDuration": result.total_duration,
            },
            "metadata": {
                "source": "video-editor",
                "clipCount": len(request.video_urls),
                "width": result.output_width,
                "height": result.output_height,
                "duration": result.total_duration,
                "isVertical": result.is_vertical,
                "audioNormalized": True,
            },
            "tags": tags,
        }
        
        return VideoMergeResponse(
            success=True,
            url=public_url,
            clip_count=len(request.video_urls),
            total_duration=result.total_duration,
            is_vertical=result.is_vertical,
            media_item=media_item
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_message = str(e)
        user_message = "Failed to merge videos"
        error_code = "MERGE_ERROR"
        
        if "timed out" in error_message.lower():
            user_message = "Video processing timed out. Try with fewer clips."
            error_code = "TIMEOUT"
        elif "duration" in error_message.lower() or "5-minute" in error_message.lower():
            user_message = error_message
            error_code = "DURATION_LIMIT"
        elif "download" in error_message.lower():
            user_message = "Could not download one of the videos."
            error_code = "DOWNLOAD_FAILED"
        elif "ffmpeg" in error_message.lower():
            user_message = "Video processing failed. One clip may be corrupted."
            error_code = "PROCESSING_ERROR"
        
        raise HTTPException(
            status_code=500,
            detail={"error": user_message, "code": error_code}
        )


# ================== AUDIO ENDPOINTS ==================

@router.post("/process-audio", response_model=AudioProcessResponse)
async def process_audio(request: AudioProcessRequest):
    """Process video audio - add music, mute, adjust volume"""
    try:
        result = await AudioService.process_audio(
            video_url=request.video_url,
            mute_original=request.mute_original,
            background_music_url=request.background_music_url,
            original_volume=request.original_volume,
            music_volume=request.music_volume
        )
        
        # Upload to Supabase storage
        supabase = get_supabase_client()
        
        timestamp = int(datetime.now().timestamp() * 1000)
        file_name = f"audio-remix-{timestamp}.mp4"
        file_path = f"processed/{file_name}"
        
        supabase.storage.from_("media").upload(
            file_path,
            result.buffer,
            {"content-type": "video/mp4"}
        )
        
        public_url = supabase.storage.from_("media").get_public_url(file_path)
        
        media_item = {
            "type": "video",
            "source": "edited",
            "url": public_url,
            "prompt": f"Audio Remix: {request.background_music_name or 'Custom Audio'}",
            "model": "ffmpeg-audio-processor",
            "config": {
                "sourceVideo": request.video_url,
                "backgroundMusicUrl": request.background_music_url,
                "muteOriginal": request.mute_original,
                "originalVolume": request.original_volume,
                "musicVolume": request.music_volume,
                "duration": result.duration,
            },
            "metadata": {
                "duration": result.duration,
                "hasBackgroundMusic": request.background_music_url is not None,
                "originalMuted": request.mute_original,
            },
            "tags": ["edited", "audio-remix"],
        }
        
        return AudioProcessResponse(
            success=True,
            url=public_url,
            media_item=media_item
        )
        
    except Exception as e:
        error_message = str(e)
        raise HTTPException(
            status_code=500,
            detail={"error": error_message, "code": "AUDIO_PROCESS_ERROR"}
        )


# ================== LIBRARY ENDPOINTS ==================

@router.get("/library")
async def get_media_library(
    workspace_id: str,
    type: Optional[str] = None,
    source: Optional[str] = None,
    is_favorite: bool = False,
    folder: Optional[str] = None,
    search: Optional[str] = None,
    tags: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get media library items with filters"""
    try:
        supabase = get_supabase_client()
        
        # Build query
        query = supabase.table("media_library").select("*").eq("workspace_id", workspace_id)
        
        if type:
            query = query.eq("type", type)
        if source:
            query = query.eq("source", source)
        if is_favorite:
            query = query.eq("is_favorite", True)
        if folder:
            query = query.eq("folder", folder)
        if search:
            query = query.ilike("prompt", f"%{search}%")
        if tags:
            tag_list = tags.split(",")
            query = query.contains("tags", tag_list)
        
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        return {
            "items": result.data or [],
            "total": len(result.data or []),
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch media items")


@router.post("/library")
async def create_media_item(request: CreateMediaItemRequest):
    """Create a new media item in the library"""
    try:
        supabase = get_supabase_client()
        
        media_item = request.media_item
        media_item["workspace_id"] = request.workspace_id
        media_item["created_at"] = datetime.now().isoformat()
        media_item["updated_at"] = datetime.now().isoformat()
        
        result = supabase.table("media_library").insert(media_item).execute()
        
        return {"success": True, "data": result.data[0] if result.data else None}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create media item")


@router.patch("/library")
async def update_media_item(request: UpdateMediaItemRequest):
    """Update a media item"""
    try:
        supabase = get_supabase_client()
        
        updates = request.updates
        updates["updated_at"] = datetime.now().isoformat()
        
        result = supabase.table("media_library").update(updates).eq(
            "id", request.media_id
        ).eq("workspace_id", request.workspace_id).execute()
        
        return {"success": True, "data": result.data[0] if result.data else None}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update media item")


@router.delete("/library")
async def delete_media_item(workspace_id: str, media_id: str):
    """Delete a media item"""
    try:
        supabase = get_supabase_client()
        
        # Get the item first to find the file URL
        get_result = supabase.table("media_library").select("url").eq(
            "id", media_id
        ).eq("workspace_id", workspace_id).execute()
        
        if get_result.data and get_result.data[0].get("url"):
            url = get_result.data[0]["url"]
            # Extract file path from URL
            if "/storage/v1/object/public/media/" in url:
                file_path = url.split("/storage/v1/object/public/media/")[1]
                try:
                    supabase.storage.from_("media").remove([file_path])
                except Exception:
                    pass  # Continue even if storage delete fails
        
        # Delete the database record
        supabase.table("media_library").delete().eq(
            "id", media_id
        ).eq("workspace_id", workspace_id).execute()
        
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete media item")


# ================== INFO ENDPOINT ==================

@router.get("/")
async def get_media_studio_info():
    """Get Media Studio service information"""
    return {
        "service": "Media Studio",
        "version": "1.0.0",
        "endpoints": {
            "resize-image": {
                "GET": "Get available image platform presets",
                "POST": "Resize an image for a platform"
            },
            "resize-video": {
                "GET": "Get available video platform presets",
                "POST": "Resize a video for a platform"
            },
            "merge-videos": {
                "POST": "Merge multiple videos into one"
            },
            "process-audio": {
                "POST": "Process video audio (add music, adjust volume)"
            },
            "library": {
                "GET": "Get media library items",
                "POST": "Create a media item",
                "PATCH": "Update a media item",
                "DELETE": "Delete a media item"
            }
        },
        "platform_presets": {
            "image": len(ImageService.get_presets()),
            "video": len(VideoService.get_presets())
        }
    }
