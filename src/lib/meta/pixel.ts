/**
 * Facebook Pixel Client-Side Helper
 * Utilities for tracking events on the client side
 */

/**
 * Hash a string using SHA-256 (for email/phone hashing)
 * Note: In production, hashing should be done server-side for security
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get Facebook Click ID (fbc) from cookie
 */
export function getFacebookClickId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_fbc') {
      return value;
    }
  }
  return null;
}

/**
 * Get Facebook Browser ID (fbp) from cookie
 */
export function getFacebookBrowserId(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '_fbp') {
      return value;
    }
  }
  return null;
}

/**
 * Track a conversion event
 */
export async function trackPixelEvent(
  pixelId: string,
  eventName: string,
  options: {
    eventId?: string;
    eventTime?: number;
    userData?: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      externalId?: string;
    };
    customData?: {
      value?: number;
      currency?: string;
      contentName?: string;
      contentCategory?: string;
      contentIds?: string[];
      numItems?: number;
      orderId?: string;
    };
    eventSourceUrl?: string;
    actionSource?: 'website' | 'app' | 'phone_call' | 'email' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  } = {}
) {
  try {
    // Hash user data if provided
    const hashedUserData: any = {};
    
    if (options.userData?.email) {
      hashedUserData.em = await hashString(options.userData.email);
    }
    if (options.userData?.phone) {
      hashedUserData.ph = await hashString(options.userData.phone);
    }
    if (options.userData?.firstName) {
      hashedUserData.fn = await hashString(options.userData.firstName);
    }
    if (options.userData?.lastName) {
      hashedUserData.ln = await hashString(options.userData.lastName);
    }
    if (options.userData?.externalId) {
      hashedUserData.external_id = options.userData.externalId;
    }

    // Get Facebook IDs from cookies
    const fbc = getFacebookClickId();
    const fbp = getFacebookBrowserId();
    if (fbc) hashedUserData.fbc = fbc;
    if (fbp) hashedUserData.fbp = fbp;

    // Get client IP and user agent (will be set server-side)
    hashedUserData.client_ip_address = options.userData?.externalId; // Will be set server-side
    hashedUserData.client_user_agent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

    const event = {
      event_name: eventName,
      event_time: options.eventTime || Math.floor(Date.now() / 1000),
      event_id: options.eventId || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_source_url: options.eventSourceUrl || (typeof window !== 'undefined' ? window.location.href : undefined),
      action_source: options.actionSource || 'website',
      user_data: hashedUserData,
      custom_data: options.customData ? {
        value: options.customData.value,
        currency: options.customData.currency || 'USD',
        content_name: options.customData.contentName,
        content_category: options.customData.contentCategory,
        content_ids: options.customData.contentIds,
        num_items: options.customData.numItems,
        order_id: options.customData.orderId,
      } : undefined,
    };

    // Send to server-side endpoint
    const response = await fetch('/api/meta-ads/pixel/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pixel_id: pixelId,
        events: [event],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to track event');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Common event tracking helpers
 */
export const PixelTracker = {
  /**
   * Track page view
   */
  pageView: (pixelId: string, pageUrl?: string) => {
    return trackPixelEvent(pixelId, 'PageView', {
      eventSourceUrl: pageUrl,
    });
  },

  /**
   * Track purchase
   */
  purchase: (
    pixelId: string,
    value: number,
    currency: string,
    orderId: string,
    userData?: { email?: string; phone?: string }
  ) => {
    return trackPixelEvent(pixelId, 'Purchase', {
      userData,
      customData: {
        value,
        currency,
        orderId,
      },
    });
  },

  /**
   * Track add to cart
   */
  addToCart: (
    pixelId: string,
    value: number,
    currency: string,
    contentName?: string,
    contentIds?: string[]
  ) => {
    return trackPixelEvent(pixelId, 'AddToCart', {
      customData: {
        value,
        currency,
        contentName,
        contentIds,
      },
    });
  },

  /**
   * Track lead
   */
  lead: (pixelId: string, userData?: { email?: string; phone?: string; firstName?: string; lastName?: string }) => {
    return trackPixelEvent(pixelId, 'Lead', {
      userData,
    });
  },

  /**
   * Track complete registration
   */
  completeRegistration: (
    pixelId: string,
    userData?: { email?: string; phone?: string; firstName?: string; lastName?: string }
  ) => {
    return trackPixelEvent(pixelId, 'CompleteRegistration', {
      userData,
    });
  },
};

