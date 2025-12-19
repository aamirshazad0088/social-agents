/**
 * Media Type Utilities
 * Shared utilities for detecting and validating media types
 */

// Define media type mappings
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'gif', 'm4v', 'flv', 'wmv', '3gp'];
export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic', 'heif', 'avif'];

// MIME type mappings
export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-flv',
  'video/x-ms-wmv',
  'video/3gpp',
  'image/gif', // GIF can be animated, treat as video
];

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/heic',
  'image/heif',
  'image/avif',
];

export type MediaType = 'image' | 'video';

/**
 * Detect media type from URL
 * Checks file extension in the URL path
 */
export function detectMediaTypeFromUrl(url: string): MediaType | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    // Check for video extensions in URL
    for (const ext of VIDEO_EXTENSIONS) {
      if (pathname.includes(`.${ext}`) || pathname.endsWith(ext)) {
        return 'video';
      }
    }
    
    // Check for image extensions in URL
    for (const ext of IMAGE_EXTENSIONS) {
      if (pathname.includes(`.${ext}`) || pathname.endsWith(ext)) {
        return 'image';
      }
    }
  } catch {
    // URL parsing failed
  }
  
  return null;
}

/**
 * Detect media type from MIME type
 */
export function detectMediaTypeFromMime(mimeType: string): MediaType | null {
  const normalizedMime = mimeType.toLowerCase();
  
  if (VIDEO_MIME_TYPES.includes(normalizedMime) || normalizedMime.startsWith('video/')) {
    return 'video';
  }
  
  if (IMAGE_MIME_TYPES.includes(normalizedMime) || normalizedMime.startsWith('image/')) {
    // Special case: GIF is treated as video (can be animated)
    if (normalizedMime === 'image/gif') {
      return 'video';
    }
    return 'image';
  }
  
  return null;
}

/**
 * Detect media type from file extension
 */
export function detectMediaTypeFromExtension(extension: string): MediaType | null {
  const normalizedExt = extension.toLowerCase().replace(/^\./, '');
  
  if (VIDEO_EXTENSIONS.includes(normalizedExt)) {
    return 'video';
  }
  
  if (IMAGE_EXTENSIONS.includes(normalizedExt)) {
    return 'image';
  }
  
  return null;
}

/**
 * Detect media type from format string (e.g., 'png', 'mp4')
 */
export function detectMediaTypeFromFormat(format: string): MediaType {
  const normalizedFormat = format.toLowerCase();
  
  if (VIDEO_EXTENSIONS.includes(normalizedFormat)) {
    return 'video';
  }
  
  // Default to image for all other formats
  return 'image';
}

/**
 * Comprehensive media type detection
 * Tries multiple methods in order of reliability:
 * 1. URL extension (most reliable for remote files)
 * 2. MIME type (reliable when available)
 * 3. Format string (fallback)
 * 
 * @param options Detection options
 * @returns Detected media type ('image' or 'video')
 */
export function detectMediaType(options: {
  url?: string;
  mimeType?: string;
  format?: string;
}): MediaType {
  const { url, mimeType, format } = options;
  
  // 1. Try URL extension first (most reliable)
  if (url) {
    const typeFromUrl = detectMediaTypeFromUrl(url);
    if (typeFromUrl) {
      return typeFromUrl;
    }
  }
  
  // 2. Try MIME type
  if (mimeType) {
    const typeFromMime = detectMediaTypeFromMime(mimeType);
    if (typeFromMime) {
      return typeFromMime;
    }
  }
  
  // 3. Try format string
  if (format) {
    return detectMediaTypeFromFormat(format);
  }
  
  // Default to image
  return 'image';
}

/**
 * Check if a URL points to a video
 */
export function isVideoUrl(url: string): boolean {
  return detectMediaTypeFromUrl(url) === 'video';
}

/**
 * Check if a URL points to an image
 */
export function isImageUrl(url: string): boolean {
  const type = detectMediaTypeFromUrl(url);
  return type === 'image' || type === null; // Default to image if unknown
}

/**
 * Get file extension from URL
 */
export function getExtensionFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Validate if a file type is supported
 */
export function isSupportedMediaType(mimeType: string): boolean {
  return detectMediaTypeFromMime(mimeType) !== null;
}

/**
 * Get accepted file types for file input
 */
export function getAcceptedFileTypes(): string {
  const imageTypes = IMAGE_MIME_TYPES.join(',');
  const videoTypes = VIDEO_MIME_TYPES.filter(t => t !== 'image/gif').join(',');
  return `${imageTypes},${videoTypes}`;
}
