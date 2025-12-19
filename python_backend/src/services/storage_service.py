"""
Storage Service
Production-ready file storage service using Supabase Storage
Handles file uploads, signed URLs, and file management
"""
import httpx
import mimetypes
from typing import Optional, Dict, Any, BinaryIO
from datetime import timedelta

from ..config import settings


class StorageService:
    """Supabase Storage service for file management"""
    
    def __init__(self):
        self._client = None
        self.bucket_name = 'media'  # Default bucket for media files
    
    @property
    def client(self):
        """Lazy client initialization"""
        if self._client is None:
            from .supabase_service import get_supabase_client
            self._client = get_supabase_client()
        return self._client
    
    async def upload_file(
        self,
        file_path: str,
        file_data: bytes,
        content_type: Optional[str] = None,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload file to Supabase Storage
        
        Args:
            file_path: Path within bucket (e.g., 'workspace_id/image.jpg')
            file_data: File binary data
            content_type: MIME type (auto-detected if not provided)
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with:
            - success: bool
            - path: str (file path in storage)
            - url: str (public URL if bucket is public)
            - error: str (if failed)
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # Auto-detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(file_path)
                content_type = content_type or 'application/octet-stream'
            
            # Upload to Supabase Storage
            response = self.client.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_data,
                file_options={'content-type': content_type}
            )
            
            # Get public URL (if bucket is public)
            public_url = self.client.storage.from_(bucket_name).get_public_url(file_path)
            
            return {
                'success': True,
                'path': file_path,
                'url': public_url,
                'bucket': bucket_name
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_from_url(
        self,
        file_path: str,
        source_url: str,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Download file from URL and upload to Supabase Storage
        
        Args:
            file_path: Path within bucket
            source_url: URL to download file from
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with success, path, url, error
        """
        try:
            # Download file from URL
            async with httpx.AsyncClient() as client:
                response = await client.get(source_url, follow_redirects=True)
                response.raise_for_status()
                
                file_data = response.content
                content_type = response.headers.get('content-type')
            
            # Upload to storage
            return await self.upload_file(
                file_path=file_path,
                file_data=file_data,
                content_type=content_type,
                bucket=bucket
            )
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to download or upload file: {str(e)}'
            }
    
    async def get_signed_url(
        self,
        file_path: str,
        expires_in: int = 3600,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate signed URL for private file access
        
        Args:
            file_path: Path within bucket
            expires_in: Expiration time in seconds (default: 1 hour)
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with:
            - success: bool
            - signed_url: str
            - expires_in: int
            - error: str (if failed)
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # Generate signed URL
            signed_url = self.client.storage.from_(bucket_name).create_signed_url(
                path=file_path,
                expires_in=expires_in
            )
            
            return {
                'success': True,
                'signed_url': signed_url['signedURL'],
                'expires_in': expires_in
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def delete_file(
        self,
        file_path: str,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete file from Supabase Storage
        
        Args:
            file_path: Path within bucket
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with success, error
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # Delete file
            self.client.storage.from_(bucket_name).remove([file_path])
            
            return {'success': True}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def list_files(
        self,
        folder_path: str = '',
        bucket: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        List files in a folder
        
        Args:
            folder_path: Folder path within bucket
            bucket: Bucket name (default: 'media')
            limit: Maximum number of files to return
            
        Returns:
            Dict with:
            - success: bool
            - files: List[Dict] (file metadata)
            - error: str (if failed)
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # List files
            files = self.client.storage.from_(bucket_name).list(
                path=folder_path,
                options={'limit': limit}
            )
            
            return {
                'success': True,
                'files': files
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def move_file(
        self,
        from_path: str,
        to_path: str,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Move/rename file within bucket
        
        Args:
            from_path: Current file path
            to_path: New file path
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with success, error
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # Move file
            self.client.storage.from_(bucket_name).move(from_path, to_path)
            
            return {'success': True}
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_file_metadata(
        self,
        file_path: str,
        bucket: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get file metadata
        
        Args:
            file_path: File path within bucket
            bucket: Bucket name (default: 'media')
            
        Returns:
            Dict with success, metadata, error
        """
        try:
            bucket_name = bucket or self.bucket_name
            
            # Get file info
            files = self.client.storage.from_(bucket_name).list(
                path='/'.join(file_path.split('/')[:-1]),
                options={'search': file_path.split('/')[-1]}
            )
            
            if not files:
                return {
                    'success': False,
                    'error': 'File not found'
                }
            
            return {
                'success': True,
                'metadata': files[0]
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Singleton instance
storage_service = StorageService()


# Helper functions for easy access
async def upload_file(
    file_path: str,
    file_data: bytes,
    content_type: Optional[str] = None,
    bucket: Optional[str] = None
) -> Dict[str, Any]:
    """Upload file to storage"""
    return await storage_service.upload_file(file_path, file_data, content_type, bucket)


async def upload_from_url(
    file_path: str,
    source_url: str,
    bucket: Optional[str] = None
) -> Dict[str, Any]:
    """Download from URL and upload to storage"""
    return await storage_service.upload_from_url(file_path, source_url, bucket)


async def get_signed_url(
    file_path: str,
    expires_in: int = 3600,
    bucket: Optional[str] = None
) -> Dict[str, Any]:
    """Generate signed URL for private file"""
    return await storage_service.get_signed_url(file_path, expires_in, bucket)


async def delete_file(
    file_path: str,
    bucket: Optional[str] = None
) -> Dict[str, Any]:
    """Delete file from storage"""
    return await storage_service.delete_file(file_path, bucket)
