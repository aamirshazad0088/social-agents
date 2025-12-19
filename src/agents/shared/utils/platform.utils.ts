/**
 * Platform Utilities
 * Helper functions for platform-specific operations
 */

import { Platform } from '@/types';
import { PLATFORMS } from '@/constants';

/**
 * Get detailed platform information for prompts
 */
export function getPlatformDetails(platforms: Platform[]): string {
  return platforms
    .map((p) => {
      const platformInfo = PLATFORMS.find((plat) => plat.id === p);
      return `- ${platformInfo?.name}: Be mindful of its audience and character limit of ${platformInfo?.characterLimit}.`;
    })
    .join('\n');
}

/**
 * Validate platform IDs
 */
export function validatePlatforms(platforms: Platform[]): boolean {
  const validPlatforms = PLATFORMS.map((p) => p.id);
  return platforms.every((p) => validPlatforms.includes(p));
}

/**
 * Get platform character limit
 */
export function getPlatformCharLimit(platform: Platform): number {
  const platformInfo = PLATFORMS.find((p) => p.id === platform);
  return platformInfo?.characterLimit || 280;
}
