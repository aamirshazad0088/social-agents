/**
 * Meta Ad Creative Builder - v24.0
 * Builds proper object_story_spec for Meta Marketing API
 * 
 * @see https://developers.facebook.com/docs/marketing-api/creative
 * @see https://developers.facebook.com/docs/marketing-api/reference/ad-account/adcreatives
 */

import type { 
  AdCreative, 
  ObjectStorySpec, 
  LinkData, 
  PhotoData, 
  VideoData, 
  CallToActionType,
  DegreesOfFreedomSpec 
} from '@/types/metaAds';

/**
 * Creative options for Advantage+ Creative enhancements (v24.0)
 */
export interface CreativeOptions {
  instagramActorId?: string; // Required for Instagram-only placements
  enableAdvantageCreative?: boolean; // Enable Advantage+ Creative optimizations
  enableTextGeneration?: boolean; // AI-generated text variations
  enableImageEnhancement?: boolean; // Image optimization
}

/**
 * Build object_story_spec for link ad (image with link)
 * @param pageId - Facebook Page ID
 * @param creative - Creative content configuration
 * @param options - Optional creative options for v24.0 features
 */
export function buildLinkAdCreative(
  pageId: string,
  creative: {
    imageHash?: string;
    imageUrl?: string;
    message?: string;
    headline?: string;
    description?: string;
    linkUrl: string;
    callToActionType?: CallToActionType;
  },
  options?: CreativeOptions
): ObjectStorySpec {
  const linkData: LinkData = {
    link: creative.linkUrl,
    message: creative.message,
    name: creative.headline,
    description: creative.description,
    call_to_action: creative.callToActionType ? {
      type: creative.callToActionType,
      value: { link: creative.linkUrl },
    } : undefined,
  };

  // Add image hash or URL
  if (creative.imageHash) {
    linkData.image_hash = creative.imageHash;
  } else if (creative.imageUrl) {
    linkData.picture = creative.imageUrl;
  }

  const spec: ObjectStorySpec = {
    page_id: pageId,
    link_data: linkData,
  };

  // Add Instagram actor ID for Instagram placements (v24.0)
  if (options?.instagramActorId) {
    spec.instagram_actor_id = options.instagramActorId;
  }

  return spec;
}

/**
 * Build object_story_spec for Page Like ad (v24.0)
 * Uses LIKE_PAGE call to action as required by Meta API
 * @param pageId - Facebook Page ID
 * @param creative - Creative content configuration
 * @param options - Optional creative options
 */
export function buildPageLikeAdCreative(
  pageId: string,
  creative: {
    imageHash?: string;
    imageUrl?: string;
    videoId?: string;
    thumbnailUrl?: string;
    message?: string;
  },
  options?: CreativeOptions
): ObjectStorySpec {
  // Video-based Page Like ad
  if (creative.videoId) {
    const videoData: VideoData = {
      video_id: creative.videoId,
      image_url: creative.thumbnailUrl,
      call_to_action: {
        type: 'LIKE_PAGE' as CallToActionType,
        value: { page: pageId },
      },
    };

    const spec: ObjectStorySpec = {
      page_id: pageId,
      video_data: videoData,
    };

    if (options?.instagramActorId) {
      spec.instagram_actor_id = options.instagramActorId;
    }

    return spec;
  }

  // Image-based Page Like ad
  const linkData: LinkData = {
    link: `https://www.facebook.com/${pageId}`,
    message: creative.message,
    call_to_action: {
      type: 'LIKE_PAGE' as CallToActionType,
      value: { page: pageId },
    },
  };

  if (creative.imageHash) {
    linkData.image_hash = creative.imageHash;
  } else if (creative.imageUrl) {
    linkData.picture = creative.imageUrl;
  }

  const spec: ObjectStorySpec = {
    page_id: pageId,
    link_data: linkData,
  };

  if (options?.instagramActorId) {
    spec.instagram_actor_id = options.instagramActorId;
  }

  return spec;
}

/**
 * Build object_story_spec for photo ad (image without link)
 * @param pageId - Facebook Page ID
 * @param creative - Creative content configuration
 * @param options - Optional creative options
 */
export function buildPhotoAdCreative(
  pageId: string,
  creative: {
    imageHash?: string;
    imageUrl?: string;
    caption?: string;
  },
  options?: CreativeOptions
): ObjectStorySpec {
  const photoData: PhotoData = {
    caption: creative.caption,
  };

  if (creative.imageHash) {
    photoData.image_hash = creative.imageHash;
  } else if (creative.imageUrl) {
    photoData.url = creative.imageUrl;
  }

  const spec: ObjectStorySpec = {
    page_id: pageId,
    photo_data: photoData,
  };

  // Add Instagram actor ID for Instagram placements (v24.0)
  if (options?.instagramActorId) {
    spec.instagram_actor_id = options.instagramActorId;
  }

  return spec;
}

/**
 * Build object_story_spec for video ad
 * @param pageId - Facebook Page ID
 * @param creative - Video creative configuration
 * @param options - Optional creative options
 */
export function buildVideoAdCreative(
  pageId: string,
  creative: {
    videoId: string;
    imageHash?: string;
    title?: string;
    message?: string;
    linkUrl?: string;
    callToActionType?: CallToActionType;
  },
  options?: CreativeOptions
): ObjectStorySpec {
  const videoData: VideoData = {
    video_id: creative.videoId,
    title: creative.title,
    message: creative.message,
    call_to_action: creative.callToActionType && creative.linkUrl ? {
      type: creative.callToActionType,
      value: { link: creative.linkUrl },
    } : undefined,
  };

  if (creative.imageHash) {
    videoData.image_hash = creative.imageHash;
  }

  const spec: ObjectStorySpec = {
    page_id: pageId,
    video_data: videoData,
  };

  // Add Instagram actor ID for Instagram placements (v24.0)
  if (options?.instagramActorId) {
    spec.instagram_actor_id = options.instagramActorId;
  }

  return spec;
}

/**
 * Build object_story_spec for carousel ad
 * @param pageId - Facebook Page ID
 * @param creative - Carousel creative configuration
 * @param options - Optional creative options
 */
export function buildCarouselAdCreative(
  pageId: string,
  creative: {
    linkUrl: string;
    message?: string;
    childAttachments: Array<{
      link: string;
      name?: string;
      description?: string;
      imageHash?: string;
      imageUrl?: string;
      callToActionType?: CallToActionType;
    }>;
  },
  options?: CreativeOptions
): ObjectStorySpec {
  const linkData: LinkData = {
    link: creative.linkUrl,
    message: creative.message,
    child_attachments: creative.childAttachments.map(attachment => ({
      link: attachment.link,
      name: attachment.name,
      description: attachment.description,
      image_hash: attachment.imageHash,
      picture: attachment.imageUrl,
      call_to_action: attachment.callToActionType ? {
        type: attachment.callToActionType,
        value: { link: attachment.link },
      } : undefined,
    })),
  };

  const spec: ObjectStorySpec = {
    page_id: pageId,
    link_data: linkData,
  };

  // Add Instagram actor ID for Instagram placements (v24.0)
  if (options?.instagramActorId) {
    spec.instagram_actor_id = options.instagramActorId;
  }

  return spec;
}

/**
 * Build degrees_of_freedom_spec for Advantage+ Creative (v24.0)
 * Enables AI-powered creative optimizations
 */
export function buildDegreesOfFreedomSpec(
  options: CreativeOptions
): DegreesOfFreedomSpec | undefined {
  if (!options.enableAdvantageCreative) {
    return undefined;
  }

  return {
    creative_features_spec: {
      standard_enhancements: { 
        enroll_status: options.enableAdvantageCreative ? 'OPT_IN' : 'OPT_OUT' 
      },
      text_generation: { 
        enroll_status: options.enableTextGeneration ? 'OPT_IN' : 'OPT_OUT' 
      },
      image_enhancement: { 
        enroll_status: options.enableImageEnhancement ? 'OPT_IN' : 'OPT_OUT' 
      },
      adapt_to_placement: { 
        enroll_status: 'OPT_IN' // Recommended for multi-placement ads
      },
    },
  };
}

/**
 * Build complete ad creative object for API
 * @param pageId - Facebook Page ID
 * @param creative - Creative configuration
 * @param options - Optional creative options for v24.0 features
 */
export function buildAdCreative(
  pageId: string,
  creative: AdCreative,
  options?: CreativeOptions
): { 
  object_story_spec: ObjectStorySpec;
  degrees_of_freedom_spec?: DegreesOfFreedomSpec;
} {
  // If object_story_spec is already provided, use it
  if (creative.object_story_spec) {
    const result: { object_story_spec: ObjectStorySpec; degrees_of_freedom_spec?: DegreesOfFreedomSpec } = { 
      object_story_spec: creative.object_story_spec 
    };
    
    // Add degrees_of_freedom_spec if Advantage+ Creative is enabled
    if (options?.enableAdvantageCreative) {
      result.degrees_of_freedom_spec = buildDegreesOfFreedomSpec(options);
    }
    
    return result;
  }

  // Build result object
  const buildResult = (objectStorySpec: ObjectStorySpec) => {
    const result: { object_story_spec: ObjectStorySpec; degrees_of_freedom_spec?: DegreesOfFreedomSpec } = {
      object_story_spec: objectStorySpec,
    };
    
    // Add degrees_of_freedom_spec if Advantage+ Creative is enabled
    if (options?.enableAdvantageCreative) {
      result.degrees_of_freedom_spec = buildDegreesOfFreedomSpec(options);
    }
    
    return result;
  };

  // Build from simplified creative format
  
  // Page Like ads - use special LIKE_PAGE CTA format (v24.0 requirement)
  if (creative.call_to_action_type === 'LIKE_PAGE') {
    return buildResult(
      buildPageLikeAdCreative(pageId, {
        imageHash: creative.image_hash,
        imageUrl: creative.image_url,
        videoId: creative.video_id,
        message: creative.body,
      }, options)
    );
  }

  if (creative.video_id) {
    return buildResult(
      buildVideoAdCreative(pageId, {
        videoId: creative.video_id,
        imageHash: creative.image_hash,
        title: creative.title,
        message: creative.body,
        linkUrl: creative.link_url || '',
        callToActionType: creative.call_to_action_type,
      }, options)
    );
  }

  if (creative.link_url) {
    // Check if carousel (multiple images)
    const assetFeedSpec = creative.asset_feed_spec;
    if (assetFeedSpec?.images && assetFeedSpec.images.length > 1) {
      return buildResult(
        buildCarouselAdCreative(pageId, {
          linkUrl: creative.link_url,
          message: creative.body,
          childAttachments: assetFeedSpec.images.map((img, idx) => ({
            link: creative.link_url || '',
            name: assetFeedSpec.titles?.[idx]?.text || creative.title,
            description: assetFeedSpec.descriptions?.[idx]?.text,
            imageHash: img.hash,
            callToActionType: assetFeedSpec.call_to_action_types?.[idx] || creative.call_to_action_type,
          })),
        }, options)
      );
    }

    // Single image link ad
    return buildResult(
      buildLinkAdCreative(pageId, {
        imageHash: creative.image_hash,
        imageUrl: creative.image_url,
        message: creative.body,
        headline: creative.title,
        linkUrl: creative.link_url,
        callToActionType: creative.call_to_action_type,
      }, options)
    );
  }

  // Photo ad (no link)
  return buildResult(
    buildPhotoAdCreative(pageId, {
      imageHash: creative.image_hash,
      imageUrl: creative.image_url,
      caption: creative.body,
    }, options)
  );
}

