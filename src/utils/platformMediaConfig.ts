/**
 * Platform Media Configuration
 * Defines what media types each platform supports based on content format
 */

import { Platform } from '@/types';

export interface MediaRequirements {
  supportsImage: boolean;
  supportsVideo: boolean;
  requiresImage: boolean; // Must have image
  requiresVideo: boolean; // Must have video
  label: string;
  placeholder: string;
  aspectRatio?: string;
}

/**
 * Get media requirements for a platform based on content type
 */
export function getPlatformMediaConfig(
  platform: Platform,
  contentType?: 'video' | 'text' | 'image',
  format?: string
): MediaRequirements {
  // Platform-specific configurations
  const configs: Record<Platform, Record<string, MediaRequirements>> = {
    tiktok: {
      video: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'TikTok Video',
        placeholder: 'Short video description with hashtags...',
        aspectRatio: '9:16'
      },
      slideshow: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'TikTok Slideshow',
        placeholder: 'Photo slideshow description...',
        aspectRatio: '9:16'
      }
    },
    instagram: {
      post: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Instagram Post',
        placeholder: 'Post caption with hashtags...',
        aspectRatio: '1:1'
      },
      feed: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'Instagram Feed Post',
        placeholder: 'Feed post caption...',
        aspectRatio: '1:1'
      },
      carousel: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: true,
        requiresVideo: false,
        label: 'Instagram Carousel',
        placeholder: 'Carousel caption (2-10 slides)...',
        aspectRatio: '1:1'
      },
      reel: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'Instagram Reel',
        placeholder: 'Reel description (up to 90 seconds)...',
        aspectRatio: '9:16'
      },
      story: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Instagram Story',
        placeholder: 'Story caption (24hr visibility)...',
        aspectRatio: '9:16'
      }
    },
    youtube: {
      video: {
        supportsImage: true, // Thumbnail
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'YouTube Video',
        placeholder: 'Video description with tags...',
        aspectRatio: '16:9'
      },
      short: {
        supportsImage: true, // Thumbnail
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'YouTube Short',
        placeholder: 'Short description (up to 60 seconds)...',
        aspectRatio: '9:16'
      },
      thumbnail: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'YouTube Thumbnail',
        placeholder: 'Thumbnail for video...',
        aspectRatio: '16:9'
      }
    },
    facebook: {
      post: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Facebook Post',
        placeholder: 'What\'s on your mind?...'
      },
      text: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Facebook Post',
        placeholder: 'What\'s on your mind?...'
      },
      image: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'Facebook Image Post',
        placeholder: 'Post with image...'
      },
      video: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'Facebook Video',
        placeholder: 'Video description...'
      },
      reel: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'Facebook Reel',
        placeholder: 'Reel description (up to 90 seconds)...',
        aspectRatio: '9:16'
      },
      story: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Facebook Story',
        placeholder: 'Story caption (24hr visibility)...',
        aspectRatio: '9:16'
      }
    },
    twitter: {
      post: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Tweet',
        placeholder: 'What\'s happening? (280 chars)...'
      },
      text: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Tweet',
        placeholder: 'What\'s happening? (280 chars)...'
      },
      image: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'Tweet with Image',
        placeholder: 'Tweet text (up to 4 images)...'
      },
      video: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'Tweet with Video',
        placeholder: 'Tweet text (up to 2:20 video)...'
      },
      thread: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'Twitter Thread',
        placeholder: 'Thread tweet (connected tweets)...'
      }
    },
    linkedin: {
      post: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'LinkedIn Post',
        placeholder: 'Share your professional thoughts...'
      },
      text: {
        supportsImage: true,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: false,
        label: 'LinkedIn Post',
        placeholder: 'Share your thoughts...'
      },
      image: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'LinkedIn Image Post',
        placeholder: 'Professional post with image...'
      },
      video: {
        supportsImage: false,
        supportsVideo: true,
        requiresImage: false,
        requiresVideo: true,
        label: 'LinkedIn Video',
        placeholder: 'Video description...'
      },
      article: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: false,
        requiresVideo: false,
        label: 'LinkedIn Article',
        placeholder: 'Long-form professional content...'
      },
      carousel: {
        supportsImage: true,
        supportsVideo: false,
        requiresImage: true,
        requiresVideo: false,
        label: 'LinkedIn Carousel',
        placeholder: 'Document carousel post...'
      }
    }
  };

  // Determine the config key
  let configKey = format || contentType || 'text';
  
  // Platform-specific defaults
  if (platform === 'tiktok') configKey = 'video';
  if (platform === 'youtube' && !format) configKey = 'video';
  if (platform === 'instagram' && !format) configKey = 'post';

  // Get config or return default
  const platformConfigs = configs[platform];
  if (platformConfigs && platformConfigs[configKey]) {
    return platformConfigs[configKey];
  }

  // Fallback based on content type
  if (contentType === 'video') {
    return {
      supportsImage: false,
      supportsVideo: true,
      requiresImage: false,
      requiresVideo: true,
      label: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
      placeholder: 'Video description...'
    };
  }

  if (contentType === 'image') {
    return {
      supportsImage: true,
      supportsVideo: false,
      requiresImage: true,
      requiresVideo: false,
      label: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Image Post`,
      placeholder: 'Post caption...'
    };
  }

  // Default text post
  return {
    supportsImage: true,
    supportsVideo: true,
    requiresImage: false,
    requiresVideo: false,
    label: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Post`,
    placeholder: 'Write your post...'
  };
}

/**
 * Get format badge configuration
 */
export function getFormatBadge(
  contentType?: 'video' | 'text' | 'image',
  format?: string
): { icon: string; label: string; color: string } {
  // Format-specific badges (prioritize format over contentType)
  const formatBadges: Record<string, { icon: string; label: string; color: string }> = {
    // Instagram formats
    reel: { icon: '🎬', label: 'Reel', color: 'bg-pink-100 text-pink-700' },
    carousel: { icon: '🖼️', label: 'Carousel', color: 'bg-orange-100 text-orange-700' },
    story: { icon: '⚡', label: 'Story', color: 'bg-yellow-100 text-yellow-700' },
    feed: { icon: '📸', label: 'Feed Post', color: 'bg-purple-100 text-purple-700' },
    
    // YouTube formats
    short: { icon: '📱', label: 'Short', color: 'bg-red-100 text-red-700' },
    thumbnail: { icon: '🖼️', label: 'Thumbnail', color: 'bg-red-50 text-red-600' },
    
    // Twitter formats
    thread: { icon: '🧵', label: 'Thread', color: 'bg-blue-100 text-blue-700' },
    
    // LinkedIn formats
    article: { icon: '📰', label: 'Article', color: 'bg-blue-100 text-blue-800' },
    
    // TikTok formats
    slideshow: { icon: '📚', label: 'Slideshow', color: 'bg-gray-100 text-gray-700' },
    
    // Generic formats
    video: { icon: '🎥', label: 'Video', color: 'bg-purple-100 text-purple-700' },
    post: { icon: '📝', label: 'Post', color: 'bg-gray-100 text-gray-700' },
  };

  // Check format first
  if (format && formatBadges[format]) {
    return formatBadges[format];
  }

  // Type-based badges
  if (contentType === 'video') {
    return { icon: '🎥', label: 'Video', color: 'bg-purple-100 text-purple-700' };
  }
  if (contentType === 'image') {
    return { icon: '📸', label: 'Image', color: 'bg-green-100 text-green-700' };
  }
  if (contentType === 'text') {
    return { icon: '📝', label: 'Text', color: 'bg-blue-100 text-blue-700' };
  }

  return { icon: '📄', label: 'Post', color: 'bg-gray-100 text-gray-700' };
}
