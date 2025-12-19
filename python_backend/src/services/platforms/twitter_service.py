"""
Twitter/X Service
Production-ready X API v2 client using OAuth 1.0a
Handles posting tweets, media uploads, and authentication
Uses tweepy library (latest 2025 version with X API v2 support)
"""
import tweepy
import httpx
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

from ...config import settings


class TwitterService:
    """Twitter/X API service for posting and media management"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=60.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
    
    # ============================================================================
    # CLIENT CREATION
    # ============================================================================
    
    def create_client(
        self,
        access_token: str,
        access_token_secret: str
    ) -> tweepy.Client:
        """
        Create X API client with OAuth 1.0a user tokens
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            
        Returns:
            Tweepy Client instance
        """
        api_key = settings.TWITTER_API_KEY
        api_secret = settings.TWITTER_API_SECRET
        
        if not api_key or not api_secret:
            raise ValueError("X API credentials not configured")
        
        # Create client with OAuth 1.0a
        client = tweepy.Client(
            consumer_key=api_key,
            consumer_secret=api_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        
        return client
    
    def create_api_v1(
        self,
        access_token: str,
        access_token_secret: str
    ) -> tweepy.API:
        """
        Create X API v1.1 client for media upload
        Media upload still requires v1.1 API
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            
        Returns:
            Tweepy API instance
        """
        api_key = settings.TWITTER_API_KEY
        api_secret = settings.TWITTER_API_SECRET
        
        if not api_key or not api_secret:
            raise ValueError("X API credentials not configured")
        
        # Create OAuth 1.0a handler
        auth = tweepy.OAuth1UserHandler(
            api_key,
            api_secret,
            access_token,
            access_token_secret
        )
        
        # Create API v1.1 instance
        api = tweepy.API(auth)
        
        return api
    
    # ============================================================================
    # POSTING
    # ============================================================================
    
    async def post_tweet(
        self,
        access_token: str,
        access_token_secret: str,
        text: str,
        media_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Post a tweet using X API v2
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            text: Tweet text (max 280 characters)
            media_ids: Optional list of media IDs from upload
            
        Returns:
            Dict with tweet_id and text
        """
        try:
            # Create client
            client = self.create_client(access_token, access_token_secret)
            
            # Build tweet payload
            tweet_params = {}
            
            if media_ids and len(media_ids) > 0:
                tweet_params['media_ids'] = media_ids
            
            # Post tweet
            response = await asyncio.to_thread(
                client.create_tweet,
                text=text,
                **tweet_params
            )
            
            return {
                'success': True,
                'tweet_id': response.data['id'],
                'text': response.data['text']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # ============================================================================
    # MEDIA UPLOAD
    # ============================================================================
    
    async def upload_media(
        self,
        access_token: str,
        access_token_secret: str,
        media_data: bytes,
        media_type: str = "image"
    ) -> Dict[str, Any]:
        """
        Upload media to X using v1.1 API
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            media_data: Media binary data
            media_type: Media type (image/video/gif)
            
        Returns:
            Dict with media_id
        """
        try:
            # Create API v1.1 instance
            api = self.create_api_v1(access_token, access_token_secret)
            
            # Determine media category
            if media_type == "video":
                media_category = "tweet_video"
            elif media_type == "gif":
                media_category = "tweet_gif"
            else:
                media_category = "tweet_image"
            
            # Upload media
            # For images, use simple upload
            if media_type == "image":
                media = await asyncio.to_thread(
                    api.media_upload,
                    filename="upload",
                    file=media_data
                )
            else:
                # For videos/gifs, use chunked upload
                media = await asyncio.to_thread(
                    api.chunked_upload,
                    filename="upload",
                    file=media_data,
                    media_category=media_category
                )
            
            return {
                'success': True,
                'media_id': str(media.media_id)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def upload_media_from_url(
        self,
        access_token: str,
        access_token_secret: str,
        media_url: str
    ) -> Dict[str, Any]:
        """
        Download media from URL and upload to X
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            media_url: URL of media to upload
            
        Returns:
            Dict with media_id
        """
        try:
            # Download media
            response = await self.http_client.get(media_url)
            response.raise_for_status()
            media_data = response.content
            
            # Detect media type from content-type or URL
            content_type = response.headers.get('content-type', '').lower()
            
            if 'video' in content_type or any(ext in media_url.lower() for ext in ['.mp4', '.mov', '.avi']):
                media_type = "video"
            elif 'gif' in content_type or '.gif' in media_url.lower():
                media_type = "gif"
            else:
                media_type = "image"
            
            # Upload media
            return await self.upload_media(
                access_token,
                access_token_secret,
                media_data,
                media_type
            )
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # ============================================================================
    # USER INFO
    # ============================================================================
    
    async def get_user_info(
        self,
        access_token: str,
        access_token_secret: str
    ) -> Dict[str, Any]:
        """
        Get authenticated user's information
        
        Args:
            access_token: User access token
            access_token_secret: User access token secret
            
        Returns:
            Dict with user info
        """
        try:
            # Create client
            client = self.create_client(access_token, access_token_secret)
            
            # Get user info
            response = await asyncio.to_thread(
                client.get_me,
                user_fields=['id', 'name', 'username', 'profile_image_url']
            )
            
            user = response.data
            
            return {
                'success': True,
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'profile_image_url': user.profile_image_url if hasattr(user, 'profile_image_url') else None
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


# Singleton instance
twitter_service = TwitterService()


# Helper function
async def close_twitter_service():
    """Close Twitter service HTTP client"""
    await twitter_service.close()
