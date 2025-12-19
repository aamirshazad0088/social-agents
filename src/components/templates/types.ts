/**
 * Shared template types for platform templates
 * These props are passed to all platform template components
 */

import { Post, MediaAsset } from '@/types'

/**
 * Base props for all platform templates
 * Extended by PlatformTemplateRenderer with additional metadata
 */
export interface PlatformTemplateProps {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
  
  // Additional metadata from PlatformContentObject
  title?: string
  hashtags?: string[]
  contentType?: 'video' | 'text' | 'image'
  contentFormat?: 'post' | 'carousel' | 'reel' | 'short' | 'story' | 'thread' | 'article'
}
