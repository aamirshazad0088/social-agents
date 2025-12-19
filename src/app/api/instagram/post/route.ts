/**
 * Instagram - Post Content
 * POST /api/instagram/post
 *
 * Body: {
 *   caption: string,
 *   imageUrl?: string, // Public URL to image (for single media posts)
 *   mediaType?: 'image' | 'video',
 *   carouselUrls?: string[], // Array of URLs for carousel posts (2-10 items)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createMediaContainer, createReelsContainer, createCarouselContainer, createStoryContainer, publishMediaContainer, generateAppSecretProof, waitForContainerReady, refreshLongLivedToken } from '@/lib/instagram/client'
import { CredentialService } from '@/services/database'
import { InstagramCredentials } from '@/types'

/**
 * Refresh Instagram access token
 * Instagram uses Facebook's long-lived tokens (60 days)
 * Can be refreshed before expiration for another 60 days
 */
async function refreshInstagramToken(
  credentials: InstagramCredentials,
  appId: string,
  appSecret: string
): Promise<InstagramCredentials> {
  const tokenData = await refreshLongLivedToken(
    credentials.accessToken,
    appId,
    appSecret
  )

  return {
    ...credentials,
    accessToken: tokenData.access_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caption, imageUrl, mediaType, carouselUrls, postType, workspaceId, userId, scheduledPublish } = body
    
    // Check if this is a cron request
    const cronSecret = req.headers.get('x-cron-secret')
    const isCronRequest = cronSecret === process.env.CRON_SECRET && scheduledPublish === true
    
    let user: any
    let userData: { workspace_id: string } | null = null
    
    if (isCronRequest) {
      // Cron request: use provided userId and workspaceId
      if (!userId || !workspaceId) {
        return NextResponse.json({ error: 'userId and workspaceId required for scheduled publish' }, { status: 400 })
      }
      user = { id: userId }
      userData = { workspace_id: workspaceId }
    } else {
      // Regular user request: check session
      const supabase = await createServerClient()
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser()

      if (!sessionUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = sessionUser

      // Get workspace_id
      const { data: userDataResult } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', user.id)
        .maybeSingle<{ workspace_id: string }>()

      if (!userDataResult) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      userData = userDataResult
    }

    // Debug logging - see exactly what we received

    // Caption is optional for Instagram (can be empty string)
    const finalCaption = caption && typeof caption === 'string' ? caption : '';

    // Check if this is a carousel post
    const isCarousel = carouselUrls && Array.isArray(carouselUrls) && carouselUrls.length >= 2;

    if (!isCarousel && (!imageUrl || typeof imageUrl !== 'string')) {
      return NextResponse.json({ error: 'Media URL is required for Instagram' }, { status: 400 })
    }

    // Validate that URLs are publicly accessible (not blob: or data: URLs)
    if (!isCarousel && imageUrl) {
      if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
        return NextResponse.json({ 
          error: 'Instagram requires publicly accessible URLs. Please upload the media first.' 
        }, { status: 400 })
      }
    }
    
    if (isCarousel) {
      const invalidUrls = carouselUrls.filter((url: string) => 
        url.startsWith('blob:') || url.startsWith('data:')
      );
      if (invalidUrls.length > 0) {
        return NextResponse.json({ 
          error: 'Instagram requires publicly accessible URLs for carousel items. Please upload the media first.' 
        }, { status: 400 })
      }
      
      // Check for expired Canva URLs (they contain X-Amz-Expires and export-download.canva.com)
      const expiredCanvaUrls = carouselUrls.filter((url: string) => {
        if (url.includes('export-download.canva.com') && url.includes('X-Amz-Expires')) {
          // These are temporary Canva URLs that expire
          // Check if the URL has expired by looking at X-Amz-Date and X-Amz-Expires
          try {
            const urlObj = new URL(url);
            const amzDate = urlObj.searchParams.get('X-Amz-Date');
            const amzExpires = urlObj.searchParams.get('X-Amz-Expires');
            if (amzDate && amzExpires) {
              // Parse the date (format: 20251128T041159Z)
              const year = amzDate.substring(0, 4);
              const month = amzDate.substring(4, 6);
              const day = amzDate.substring(6, 8);
              const hour = amzDate.substring(9, 11);
              const minute = amzDate.substring(11, 13);
              const second = amzDate.substring(13, 15);
              const signedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
              const expiresMs = parseInt(amzExpires) * 1000;
              const expirationDate = new Date(signedDate.getTime() + expiresMs);
              
              if (new Date() > expirationDate) {
                return true; // URL has expired
              }
            }
          } catch (e) {
            // If we can't parse, assume it might be expired
            return true;
          }
        }
        return false;
      });
      
      if (expiredCanvaUrls.length > 0) {
        return NextResponse.json({ 
          error: 'Some media URLs have expired. Please re-export your Canva design or re-upload the images.',
          details: 'Canva export URLs expire after a few hours. Please export again from Canva.'
        }, { status: 400 })
      }
    }

    // Validate carousel constraints
    if (isCarousel && carouselUrls.length > 10) {
      return NextResponse.json({ error: 'Carousel cannot have more than 10 items' }, { status: 400 })
    }

    // Detect if it's a video or reel (by URL extension or explicit mediaType)
    const isVideo = !isCarousel && (
                    mediaType === 'video' || 
                    imageUrl?.includes('.mp4') || 
                    imageUrl?.includes('.mov') ||
                    imageUrl?.includes('video'));
    
    // Detect if it's a Reel (short-form vertical video)
    const isReel = mediaType === 'reel' || mediaType === 'reels';
    
    // Detect if it's a Story (24hr temporary post)
    const isStory = postType === 'story';

    // Validate caption length (2200 characters for Instagram)
    if (finalCaption.length > 2200) {
      return NextResponse.json(
        { error: 'Caption exceeds 2200 characters' },
        { status: 400 }
      )
    }

    // Get Instagram credentials from database
    // Use admin client for cron requests to bypass RLS (no user session in cron context)
    
    const credentials = await CredentialService.getPlatformCredentials(
      'instagram',
      user.id,
      userData.workspace_id,
      { useAdmin: isCronRequest }
    )


    if (!credentials || !('accessToken' in credentials) || !('userId' in credentials)) {
      return NextResponse.json(
        { error: 'Instagram not connected' },
        { status: 400 }
      )
    }
    let instagramCreds = credentials as InstagramCredentials

    // Get app credentials for token refresh
    const appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.INSTAGRAM_APP_SECRET

    // Proactive token refresh: Refresh if token expires within 7 days
    // Instagram tokens last 60 days, so we refresh 7 days before expiration
    const REFRESH_BUFFER_MS = 7 * 24 * 60 * 60 * 1000 // 7 days before expiration
    const now = Date.now()
    const expiresAt = instagramCreds.expiresAt ? new Date(instagramCreds.expiresAt).getTime() : 0

    if (expiresAt && (now + REFRESH_BUFFER_MS) > expiresAt) {
      
      if (!appId || !appSecret) {
      } else {
        try {
          const refreshedCreds = await refreshInstagramToken(instagramCreds, appId, appSecret)
          
          // Save the refreshed credentials
          await CredentialService.savePlatformCredentials(
            'instagram',
            refreshedCreds,
            user.id,
            userData.workspace_id
          )
          
          instagramCreds = refreshedCreds
        } catch (refreshError) {
          // If token is actually expired (not just close to expiring), return error
          if (now > expiresAt) {
            return NextResponse.json(
              { error: 'Access token expired. Please reconnect your Instagram account.' },
              { status: 401 }
            )
          }
          // Otherwise continue with existing token
        }
      }
    }

    // Final check: if token is actually expired and refresh failed
    if (instagramCreds.expiresAt && new Date(instagramCreds.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Access token expired. Please reconnect.' },
        { status: 400 }
      )
    }

    // Generate appsecret_proof for server-to-server API calls
    // This is required by Facebook/Instagram Graph API for enhanced security
    // Use the appSecret already defined above for token refresh
    if (!appSecret) {
      return NextResponse.json(
        { error: 'Instagram app secret not configured' },
        { status: 500 }
      )
    }

    const appSecretProof = generateAppSecretProof(instagramCreds.accessToken, appSecret)

    // Analyze carousel media types if applicable
    let carouselMediaTypes: string[] = [];
    if (isCarousel && carouselUrls) {
      carouselMediaTypes = carouselUrls.map((url: string) => {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp)(\?|$)/i) ||
            lowerUrl.includes('/video/') || lowerUrl.includes('/videos/')) {
          return 'VIDEO';
        }
        return 'IMAGE';
      });
    }


    // Step 1: Create media container (story, carousel, reel, video, or image)
    let container;
    let postTypeLabel = 'image';
    
    if (isStory) {
      // Create Story container (24hr temporary post)
      postTypeLabel = 'story';
      container = await createStoryContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        imageUrl,
        isVideo, // Pass whether it's a video story
        appSecretProof
      );
    } else if (isCarousel) {
      // Create carousel container with mixed images/videos
      // The createCarouselContainer function handles:
      // 1. Creating individual item containers
      // 2. Waiting for video items to process
      // 3. Creating the parent carousel container
      postTypeLabel = 'carousel';
      container = await createCarouselContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        carouselUrls,
        finalCaption,
        appSecretProof
      );
    } else if (isReel || isVideo) {
      // Create Reels container for all video content
      // Note: Instagram deprecated VIDEO media_type - all videos must use REELS now
      // See: https://developers.facebook.com/docs/instagram-api/reference/ig-user/media#creating
      postTypeLabel = isReel ? 'reel' : 'video';
      container = await createReelsContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        imageUrl,
        finalCaption,
        appSecretProof,
        true // share to feed
      );
    } else {
      // Create image container
      container = await createMediaContainer(
        instagramCreds.userId!,
        instagramCreds.accessToken,
        imageUrl,
        finalCaption,
        appSecretProof
      );
    }

    // Step 2: Wait for container to be ready
    // All media types (images, videos, reels, carousels, stories) need processing time before publishing
    const needsMoreTime = isVideo || isReel || isCarousel || (isStory && isVideo);
    await waitForContainerReady(
      container.id,
      instagramCreds.accessToken,
      appSecretProof,
      needsMoreTime ? 60 : 30, // Videos need more time (2 min), images less (1 min)
      needsMoreTime ? 2000 : 1000 // Check every 2s for videos, 1s for images
    );

    // Step 3: Publish the container
    const published = await publishMediaContainer(
      instagramCreds.userId!,
      instagramCreds.accessToken,
      container.id,
      appSecretProof
    )

    // Generate post URL (Stories have a different URL format)
    const postUrl = isStory 
      ? `https://www.instagram.com/stories/${published.id}`
      : `https://www.instagram.com/p/${published.id}`

    return NextResponse.json({
      success: true,
      postId: published.id,
      postUrl,
      caption: finalCaption,
      postType: postTypeLabel,
      mediaCount: isCarousel ? carouselUrls.length : 1,
    })
  } catch (error) {

    // Handle Instagram API errors
    const errorMessage = (error as any).message || 'Unknown error'
    
    // Provide more helpful error messages
    let userFriendlyError = 'Failed to post to Instagram';
    
    if (errorMessage.includes('Media ID is not available')) {
      userFriendlyError = 'Instagram could not process the media. Please ensure the image/video URL is publicly accessible and in a supported format (JPEG, PNG for images; MP4 for videos).';
    } else if (errorMessage.includes('Invalid image')) {
      userFriendlyError = 'The image format is not supported by Instagram. Please use JPEG or PNG format.';
    } else if (errorMessage.includes('rate limit')) {
      userFriendlyError = 'Instagram rate limit reached. Please try again later.';
    } else if (errorMessage.includes('Carousel item processing failed')) {
      userFriendlyError = 'One or more carousel items failed to process. Please ensure all images are JPEG/PNG and videos are MP4 format with proper encoding.';
    } else if (errorMessage.includes('Timeout waiting for carousel item')) {
      userFriendlyError = 'Video processing timed out. Please try with a shorter video or check the video format (MP4, H.264 codec recommended).';
    } else if (errorMessage.includes('container expired')) {
      userFriendlyError = 'Media container expired. Please try again with a fresh upload.';
    } else if (errorMessage.includes('Video upload')) {
      userFriendlyError = 'Video upload failed. Please ensure the video is MP4 format, under 100MB, and between 3 seconds to 60 minutes long.';
    } else if (errorMessage.includes('could not be fetched') || errorMessage.includes('download has failed')) {
      userFriendlyError = 'Instagram could not download the media. The URL may have expired. Please re-export from Canva or re-upload the images.';
    } else if (errorMessage.includes('Only photo or video')) {
      userFriendlyError = 'Instagram could not access the media file. The URL may have expired or is not publicly accessible. Please re-upload the images.';
    }

    return NextResponse.json(
      {
        error: userFriendlyError,
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}
