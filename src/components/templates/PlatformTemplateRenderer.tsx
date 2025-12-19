/**
 * Platform Template Renderer
 * Intelligent routing component that selects the correct template based on platform and post type
 * Supports all 6 platforms with multiple post types per platform
 */

import React from 'react'
import { Post, Platform, PostType, MediaAsset, PlatformContentObject } from '@/types'

// Import template components (will be created)
import TwitterPostTemplate from './twitter/TwitterPostTemplate'
import TwitterCarouselTemplate from './twitter/TwitterCarouselTemplate'
import InstagramFeedTemplate from './instagram/InstagramFeedTemplate'
import InstagramCarouselTemplate from './instagram/InstagramCarouselTemplate'
import InstagramReelTemplate from './instagram/InstagramReelTemplate'
import InstagramStoryTemplate from './instagram/InstagramStoryTemplate'
import FacebookPostTemplate from './facebook/FacebookPostTemplate'
import FacebookCarouselTemplate from './facebook/FacebookCarouselTemplate'
import FacebookReelTemplate from './facebook/FacebookReelTemplate'
import FacebookStoryTemplate from './facebook/FacebookStoryTemplate'
import TikTokVideoTemplate from './tiktok/TikTokVideoTemplate'
import TikTokSlideshowTemplate from './tiktok/TikTokSlideshowTemplate'
import YouTubeVideoTemplate from './youtube/YouTubeVideoTemplate'
import YouTubeShortsTemplate from './youtube/YouTubeShortsTemplate'
import LinkedInPostTemplate from './linkedin/LinkedInPostTemplate'
import LinkedInCarouselTemplate from './linkedin/LinkedInCarouselTemplate'

export interface PlatformTemplateRendererProps {
  post: Post
  platform: Platform
  postType?: PostType
  media?: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

/**
 * Main rendering component
 * Routes to appropriate template based on platform and post type
 */
export function PlatformTemplateRenderer({
  post,
  platform,
  postType = 'post',
  media = [],
  mode,
  className = '',
}: PlatformTemplateRendererProps) {
  // Get platform-specific content (handles both string and object formats)
  const platformData = post.content[platform as keyof typeof post.content];
  
  const getContent = (): string => {
    // Legacy string format
    if (typeof platformData === 'string') {
      return platformData || '';
    }
    // New object format
    if (typeof platformData === 'object' && platformData) {
      const contentObj = platformData as PlatformContentObject;
      // For text posts, return content; for video posts, return description
      return contentObj.content || contentObj.description || '';
    }
    return '';
  };

  const content = getContent();
  
  // Extract additional metadata from object format
  const contentObj = typeof platformData === 'object' ? (platformData as PlatformContentObject) : null;
  const contentType = contentObj?.type;
  const contentFormat = contentObj?.format;
  const title = contentObj?.title;
  
  // Only include hashtags for platforms that use them
  const platformsWithHashtags: Platform[] = ['instagram', 'twitter', 'tiktok', 'facebook'];
  const hashtags = platformsWithHashtags.includes(platform) 
    ? (contentObj?.hashtags || [])
    : [];

  // Common props for all templates
  const commonProps = {
    post,
    content,
    media,
    mode,
    className,
    title,
    hashtags,
    contentType,
    contentFormat,
  };

  // Route to appropriate template
  switch (platform) {
    // ==================== INSTAGRAM ====================
    case 'instagram':
      switch (postType) {
        case 'feed':
          return <InstagramFeedTemplate {...commonProps} />
        case 'carousel':
          return <InstagramCarouselTemplate {...commonProps} />
        case 'reel':
          return <InstagramReelTemplate {...commonProps} />
        case 'story':
          return <InstagramStoryTemplate {...commonProps} />
        default:
          return <InstagramFeedTemplate {...commonProps} />
      }

    // ==================== FACEBOOK ====================
    case 'facebook':
      switch (postType) {
        case 'carousel':
          return <FacebookCarouselTemplate {...commonProps} />
        case 'reel':
          return <FacebookReelTemplate {...commonProps} />
        case 'story':
          return <FacebookStoryTemplate {...commonProps} />
        default:
          return <FacebookPostTemplate {...commonProps} />
      }

    // ==================== TIKTOK ====================
    case 'tiktok':
      switch (postType) {
        case 'slideshow':
          return <TikTokSlideshowTemplate {...commonProps} />
        default:
          return <TikTokVideoTemplate {...commonProps} />
      }

    // ==================== YOUTUBE ====================
    case 'youtube':
      switch (postType) {
        case 'short':
          return <YouTubeShortsTemplate {...commonProps} />
        default:
          return <YouTubeVideoTemplate {...commonProps} />
      }

    // ==================== TWITTER ====================
    case 'twitter':
      switch (postType) {
        case 'carousel':
          return <TwitterCarouselTemplate {...commonProps} />
        default:
          return <TwitterPostTemplate {...commonProps} />
      }

    // ==================== LINKEDIN ====================
    case 'linkedin':
      switch (postType) {
        case 'carousel':
          return <LinkedInCarouselTemplate {...commonProps} />
        default:
          return <LinkedInPostTemplate {...commonProps} />
      }

    // Fallback
    default:
      return (
        <div className="p-4 bg-gray-100 rounded border border-gray-300">
          <p className="text-gray-600">Template not found for {platform}</p>
        </div>
      )
  }
}

export default PlatformTemplateRenderer
