"""
Social Media Service
Production-ready service for interacting with social media platform APIs
Handles Facebook, Instagram, LinkedIn, Twitter, TikTok, YouTube
"""
import httpx
import hmac
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime

from ..config import settings


class SocialMediaService:
    """Service for social media platform API interactions"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
    
    # ============================================================================
    # FACEBOOK API
    # ============================================================================
    
    def generate_app_secret_proof(self, access_token: str, app_secret: str) -> str:
        """
        Generate appsecret_proof for Facebook server-to-server calls
        Required for secure API calls from the backend
        
        Args:
            access_token: Facebook access token
            app_secret: Facebook app secret
            
        Returns:
            HMAC SHA256 hash as hex string
        """
        return hmac.new(
            app_secret.encode('utf-8'),
            access_token.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    async def facebook_exchange_code_for_token(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange Facebook authorization code for access token
        
        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Redirect URI used in OAuth flow
            
        Returns:
            Dict with access_token, token_type, expires_in
        """
        try:
            app_id = settings.FACEBOOK_CLIENT_ID
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            
            if not app_id or not app_secret:
                return {'success': False, 'error': 'Facebook credentials not configured'}
            
            response = await self.http_client.post(
                'https://graph.facebook.com/v24.0/oauth/access_token',
                data={
                    'client_id': app_id,
                    'client_secret': app_secret,
                    'redirect_uri': redirect_uri,
                    'code': code
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            return {
                'success': True,
                'access_token': data['access_token'],
                'token_type': data.get('token_type', 'bearer'),
                'expires_in': data.get('expires_in')
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_get_long_lived_token(
        self,
        short_lived_token: str
    ) -> Dict[str, Any]:
        """
        Exchange short-lived token for long-lived token (60 days)
        
        Args:
            short_lived_token: Short-lived access token
            
        Returns:
            Dict with access_token, expires_in
        """
        try:
            app_id = settings.FACEBOOK_CLIENT_ID
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            
            response = await self.http_client.get(
                'https://graph.facebook.com/v24.0/oauth/access_token',
                params={
                    'grant_type': 'fb_exchange_token',
                    'client_id': app_id,
                    'client_secret': app_secret,
                    'fb_exchange_token': short_lived_token
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            return {
                'success': True,
                'access_token': data['access_token'],
                'expires_in': data.get('expires_in', 5184000)  # 60 days default
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_get_pages(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """
        Get Facebook Pages managed by the user
        
        Args:
            access_token: User access token
            
        Returns:
            Dict with pages list
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            response = await self.http_client.get(
                'https://graph.facebook.com/v24.0/me/accounts',
                params={
                    'fields': 'id,name,access_token,category,type',
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            # Filter to only include Pages, exclude Groups
            pages = [p for p in data.get('data', []) if p.get('type') == 'PAGE' or not p.get('type')]
            
            return {
                'success': True,
                'pages': pages
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_post_to_page(
        self,
        page_id: str,
        page_access_token: str,
        message: str,
        link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Post to Facebook Page
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            message: Post message
            link: Optional link to share
            
        Returns:
            Dict with post_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            data = {
                'message': message,
                'access_token': page_access_token,
                'appsecret_proof': app_secret_proof
            }
            
            if link:
                data['link'] = link
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/feed',
                data=data
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'post_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_post_photo(
        self,
        page_id: str,
        page_access_token: str,
        image_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """
        Post photo to Facebook Page
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            image_url: URL of image to post
            caption: Photo caption
            
        Returns:
            Dict with post_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/photos',
                data={
                    'url': image_url,
                    'caption': caption,
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'photo_id': result['id'],
                'post_id': result.get('post_id')
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_upload_video(
        self,
        page_id: str,
        page_access_token: str,
        video_url: str,
        description: str
    ) -> Dict[str, Any]:
        """
        Upload video to Facebook Page
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            video_url: URL of video to upload
            description: Video description
            
        Returns:
            Dict with video_id
        """
        try:
            # Fetch video from URL
            video_response = await self.http_client.get(video_url)
            video_response.raise_for_status()
            video_data = video_response.content
            
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            # Upload to graph-video.facebook.com
            files = {'source': ('video.mp4', video_data, 'video/mp4')}
            data = {
                'description': description,
                'access_token': page_access_token,
                'appsecret_proof': app_secret_proof
            }
            
            response = await self.http_client.post(
                f'https://graph-video.facebook.com/v24.0/{page_id}/videos',
                files=files,
                data=data
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'video_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_upload_reel(
        self,
        page_id: str,
        page_access_token: str,
        video_url: str,
        description: str
    ) -> Dict[str, Any]:
        """
        Upload Facebook Reel (short-form vertical video)
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            video_url: URL of video to upload
            description: Reel description
            
        Returns:
            Dict with video_id
        """
        try:
            # Fetch video from URL
            video_response = await self.http_client.get(video_url)
            video_response.raise_for_status()
            video_data = video_response.content
            
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            # Step 1: Initialize upload session
            init_response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/video_reels',
                data={
                    'upload_phase': 'start',
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            init_response.raise_for_status()
            init_data = init_response.json()
            video_id = init_data['video_id']
            
            # Step 2: Upload video data
            upload_response = await self.http_client.post(
                f'https://rupload.facebook.com/video-upload/v24.0/{video_id}',
                headers={
                    'Authorization': f'OAuth {page_access_token}',
                    'offset': '0',
                    'file_size': str(len(video_data))
                },
                content=video_data
            )
            upload_response.raise_for_status()
            
            # Step 3: Finish and publish
            finish_response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/video_reels',
                data={
                    'video_id': video_id,
                    'upload_phase': 'finish',
                    'video_state': 'PUBLISHED',
                    'description': description,
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            finish_response.raise_for_status()
            result = finish_response.json()
            
            return {
                'success': True,
                'id': result.get('id', video_id)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_upload_story(
        self,
        page_id: str,
        page_access_token: str,
        media_url: str,
        is_video: bool = False
    ) -> Dict[str, Any]:
        """
        Upload Facebook Story (24-hour temporary post)
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            media_url: URL of image or video
            is_video: Whether media is video
            
        Returns:
            Dict with story_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            if is_video:
                # Fetch video from URL
                video_response = await self.http_client.get(media_url)
                video_response.raise_for_status()
                video_data = video_response.content
                
                # Upload video story
                files = {'source': ('story.mp4', video_data, 'video/mp4')}
                data = {
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
                
                response = await self.http_client.post(
                    f'https://graph-video.facebook.com/v24.0/{page_id}/video_stories',
                    files=files,
                    data=data
                )
            else:
                # Upload photo story
                response = await self.http_client.post(
                    f'https://graph.facebook.com/v24.0/{page_id}/photo_stories',
                    data={
                        'url': media_url,
                        'access_token': page_access_token,
                        'appsecret_proof': app_secret_proof
                    }
                )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_upload_photo_unpublished(
        self,
        page_id: str,
        page_access_token: str,
        image_url: str
    ) -> Dict[str, Any]:
        """
        Upload photo as unpublished (for carousel)
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            image_url: URL of image to upload
            
        Returns:
            Dict with photo_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/photos',
                data={
                    'url': image_url,
                    'published': 'false',
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'photo_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def facebook_create_carousel(
        self,
        page_id: str,
        page_access_token: str,
        photo_ids: List[str],
        message: str
    ) -> Dict[str, Any]:
        """
        Create carousel post with multiple photos
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            photo_ids: List of photo IDs (from upload_photo_unpublished)
            message: Post message
            
        Returns:
            Dict with post_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            # Create attached_media array
            attached_media = [{'media_fbid': photo_id} for photo_id in photo_ids]
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{page_id}/feed',
                json={
                    'message': message,
                    'attached_media': attached_media,
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'post_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # ============================================================================
    # INSTAGRAM API
    # ============================================================================
    
    async def instagram_get_business_account(
        self,
        page_id: str,
        page_access_token: str
    ) -> Dict[str, Any]:
        """
        Get Instagram Business Account connected to Facebook Page
        
        Args:
            page_id: Facebook Page ID
            page_access_token: Page access token
            
        Returns:
            Dict with instagram_business_account id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(page_access_token, app_secret)
            
            response = await self.http_client.get(
                f'https://graph.facebook.com/v24.0/{page_id}',
                params={
                    'fields': 'instagram_business_account',
                    'access_token': page_access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            data = response.json()
            
            ig_account = data.get('instagram_business_account')
            if not ig_account:
                return {'success': False, 'error': 'No Instagram Business Account connected'}
            
            return {
                'success': True,
                'instagram_account_id': ig_account['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_create_media_container(
        self,
        ig_account_id: str,
        access_token: str,
        image_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """
        Create Instagram media container (step 1 of posting)
        
        Args:
            ig_account_id: Instagram Business Account ID
            access_token: Access token
            image_url: URL of image to post
            caption: Post caption
            
        Returns:
            Dict with container_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_account_id}/media',
                data={
                    'image_url': image_url,
                    'caption': caption,
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'container_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_publish_media(
        self,
        ig_account_id: str,
        access_token: str,
        container_id: str
    ) -> Dict[str, Any]:
        """
        Publish Instagram media container (step 2 of posting)
        
        Args:
            ig_account_id: Instagram Business Account ID
            access_token: Access token
            container_id: Media container ID from create_media_container
            
        Returns:
            Dict with post_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_account_id}/media_publish',
                data={
                    'creation_id': container_id,
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'post_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_create_media_container(
        self,
        ig_user_id: str,
        access_token: str,
        image_url: str,
        caption: str
    ) -> Dict[str, Any]:
        """
        Create Instagram media container for image (step 1 of posting)
        
        Args:
            ig_user_id: Instagram Business Account ID
            access_token: Access token
            image_url: URL of image to post
            caption: Post caption
            
        Returns:
            Dict with container_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_user_id}/media',
                data={
                    'image_url': image_url,
                    'caption': caption,
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get('id'):
                return {'success': False, 'error': 'Media ID is not available - container creation failed'}
            
            return {
                'success': True,
                'container_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_create_reels_container(
        self,
        ig_user_id: str,
        access_token: str,
        video_url: str,
        caption: str,
        share_to_feed: bool = True
    ) -> Dict[str, Any]:
        """
        Create Instagram Reels container (short-form vertical video)
        
        Args:
            ig_user_id: Instagram Business Account ID
            access_token: Access token
            video_url: URL of video to post
            caption: Post caption
            share_to_feed: Whether to share to feed
            
        Returns:
            Dict with container_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            data = {
                'media_type': 'REELS',
                'video_url': video_url,
                'share_to_feed': str(share_to_feed).lower(),
                'access_token': access_token,
                'appsecret_proof': app_secret_proof
            }
            
            # Only add caption if not empty
            if caption and caption.strip():
                data['caption'] = caption
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_user_id}/media',
                data=data
            )
            
            response.raise_for_status()
            result = response.json()
            
            return {
                'success': True,
                'container_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_create_story_container(
        self,
        ig_user_id: str,
        access_token: str,
        media_url: str,
        is_video: bool = False
    ) -> Dict[str, Any]:
        """
        Create Instagram Story container (24-hour temporary post)
        
        Args:
            ig_user_id: Instagram Business Account ID
            access_token: Access token
            media_url: URL of image or video
            is_video: Whether media is video
            
        Returns:
            Dict with container_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            data = {
                'media_type': 'STORIES',
                'access_token': access_token,
                'appsecret_proof': app_secret_proof
            }
            
            # Add appropriate URL parameter
            if is_video:
                data['video_url'] = media_url
            else:
                data['image_url'] = media_url
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_user_id}/media',
                data=data
            )
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get('id'):
                return {'success': False, 'error': 'No container ID returned for Story'}
            
            return {
                'success': True,
                'container_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def instagram_create_carousel_container(
        self,
        ig_user_id: str,
        access_token: str,
        media_urls: List[str],
        caption: str
    ) -> Dict[str, Any]:
        """
        Create Instagram carousel container (2-10 mixed images/videos)
        
        Process:
        1. Create individual item containers
        2. Wait for video items to finish processing
        3. Create parent carousel container
        
        Args:
            ig_user_id: Instagram Business Account ID
            access_token: Access token
            media_urls: List of 2-10 media URLs
            caption: Post caption
            
        Returns:
            Dict with container_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            child_container_ids = []
            
            # Step 1: Create individual item containers
            for i, media_url in enumerate(media_urls):
                # Detect if video
                is_video = any(ext in media_url.lower() for ext in ['.mp4', '.mov', '.m4v', '/video/', '/videos/'])
                
                # Create carousel item
                data = {
                    'is_carousel_item': 'true',
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
                
                if is_video:
                    data['media_type'] = 'VIDEO'
                    data['video_url'] = media_url
                else:
                    data['image_url'] = media_url
                
                response = await self.http_client.post(
                    f'https://graph.facebook.com/v24.0/{ig_user_id}/media',
                    data=data
                )
                
                response.raise_for_status()
                result = response.json()
                
                if not result.get('id'):
                    return {'success': False, 'error': f'Failed to create carousel item {i + 1}'}
                
                container_id = result['id']
                
                # Step 2: Wait for video items to finish processing
                if is_video:
                    ready = await self._wait_for_container_finished(
                        container_id,
                        access_token,
                        app_secret_proof,
                        max_wait_seconds=180
                    )
                    if not ready:
                        return {'success': False, 'error': f'Timeout waiting for carousel item {i + 1}'}
                
                child_container_ids.append(container_id)
            
            # Step 3: Create parent carousel container
            data = {
                'media_type': 'CAROUSEL',
                'children': ','.join(child_container_ids),
                'access_token': access_token,
                'appsecret_proof': app_secret_proof
            }
            
            # Only add caption if not empty
            if caption and caption.strip():
                data['caption'] = caption
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_user_id}/media',
                data=data
            )
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get('id'):
                return {'success': False, 'error': 'No container ID returned for carousel'}
            
            return {
                'success': True,
                'container_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _wait_for_container_finished(
        self,
        container_id: str,
        access_token: str,
        app_secret_proof: str,
        max_wait_seconds: int = 120
    ) -> bool:
        """
        Wait for container to reach FINISHED status
        
        Args:
            container_id: Container ID
            access_token: Access token
            app_secret_proof: App secret proof
            max_wait_seconds: Maximum wait time in seconds
            
        Returns:
            True if finished, False if timeout
        """
        import asyncio
        start_time = datetime.utcnow()
        poll_interval = 3  # seconds
        
        while True:
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            
            if elapsed > max_wait_seconds:
                return False
            
            try:
                # Check status
                response = await self.http_client.get(
                    f'https://graph.facebook.com/v24.0/{container_id}',
                    params={
                        'fields': 'id,status,status_code',
                        'access_token': access_token,
                        'appsecret_proof': app_secret_proof
                    }
                )
                
                response.raise_for_status()
                status = response.json()
                
                status_code = status.get('status_code') or status.get('status', '')
                
                if status_code == 'FINISHED':
                    return True
                
                if status_code in ['ERROR', 'EXPIRED']:
                    return False
                
                # Still processing, wait and retry
                await asyncio.sleep(poll_interval)
                
            except Exception:
                # Transient error, wait and retry
                await asyncio.sleep(poll_interval)
    
    async def instagram_wait_for_container_ready(
        self,
        container_id: str,
        access_token: str,
        max_attempts: int = 30,
        delay_ms: int = 2000
    ) -> bool:
        """
        Wait for media container to finish processing
        
        Args:
            container_id: Container ID
            access_token: Access token
            max_attempts: Maximum number of attempts
            delay_ms: Delay between attempts in milliseconds
            
        Returns:
            True if ready, False if timeout
        """
        import asyncio
        app_secret = settings.FACEBOOK_CLIENT_SECRET
        app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
        
        for attempt in range(max_attempts):
            try:
                response = await self.http_client.get(
                    f'https://graph.facebook.com/v24.0/{container_id}',
                    params={
                        'fields': 'id,status,status_code',
                        'access_token': access_token,
                        'appsecret_proof': app_secret_proof
                    }
                )
                
                response.raise_for_status()
                status = response.json()
                
                status_code = status.get('status_code') or status.get('status', '')
                
                if status_code == 'FINISHED':
                    return True
                
                if status_code in ['ERROR', 'EXPIRED']:
                    return False
                
                # Wait before next check
                await asyncio.sleep(delay_ms / 1000)
                
            except Exception:
                # Wait and retry
                await asyncio.sleep(delay_ms / 1000)
        
        return False
    
    async def instagram_publish_media_container(
        self,
        ig_user_id: str,
        access_token: str,
        creation_id: str
    ) -> Dict[str, Any]:
        """
        Publish Instagram media container (final step)
        
        Args:
            ig_user_id: Instagram Business Account ID
            access_token: Access token
            creation_id: Container ID from create step
            
        Returns:
            Dict with post_id
        """
        try:
            app_secret = settings.FACEBOOK_CLIENT_SECRET
            app_secret_proof = self.generate_app_secret_proof(access_token, app_secret)
            
            response = await self.http_client.post(
                f'https://graph.facebook.com/v24.0/{ig_user_id}/media_publish',
                data={
                    'creation_id': creation_id,
                    'access_token': access_token,
                    'appsecret_proof': app_secret_proof
                }
            )
            
            response.raise_for_status()
            result = response.json()
            
            if not result.get('id'):
                return {'success': False, 'error': 'Post ID is not available after publishing'}
            
            return {
                'success': True,
                'post_id': result['id']
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}


# Singleton instance
social_service = SocialMediaService()


# Helper functions for easy access
async def close_social_service():
    """Close social media service HTTP client"""
    await social_service.close()
