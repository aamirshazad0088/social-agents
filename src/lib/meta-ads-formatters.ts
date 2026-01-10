/**
 * Meta Ads Formatting Utilities
 * Production-ready formatting functions for Meta Ads data display
 */

// ============================================================================
// Types
// ============================================================================

export interface AudienceSizeFields {
    approximate_count_lower_bound?: number;
    approximate_count_upper_bound?: number;
    approximate_count?: number; // Legacy field - deprecated in API v24.0
}

export interface OperationStatus {
    code: number;
    description?: string;
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number for compact display (1.2K, 3.5M, etc.)
 */
export function formatCompactNumber(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0';

    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toLocaleString();
}

/**
 * Format audience size using Meta API v24.0 fields
 * Returns range format: "1.2K - 5.6K" or single value if range unavailable
 */
export function formatAudienceSize(audience: AudienceSizeFields): string {
    const { approximate_count_lower_bound, approximate_count_upper_bound, approximate_count } = audience;

    // Use new API v24.0 range fields if available
    if (approximate_count_lower_bound !== undefined || approximate_count_upper_bound !== undefined) {
        const lower = approximate_count_lower_bound ?? 0;
        const upper = approximate_count_upper_bound ?? 0;

        // If both are 0 or -1 (inactive lookalike), show appropriate message
        if (lower <= 0 && upper <= 0) {
            return 'Calculating...';
        }

        // If lower equals upper, show single value
        if (lower === upper) {
            return formatCompactNumber(lower);
        }

        return `${formatCompactNumber(lower)} - ${formatCompactNumber(upper)}`;
    }

    // Fallback to legacy field (deprecated)
    if (approximate_count !== undefined && approximate_count > 0) {
        return formatCompactNumber(approximate_count);
    }

    return 'Calculating...';
}

/**
 * Get raw audience size value (for sorting/comparison)
 * Returns the upper bound, or legacy value, or 0
 */
export function getAudienceSizeValue(audience: AudienceSizeFields): number {
    const { approximate_count_upper_bound, approximate_count } = audience;
    return approximate_count_upper_bound ?? approximate_count ?? 0;
}

// ============================================================================
// Operation Status Formatting
// ============================================================================

const OPERATION_STATUS_LABELS: Record<number, { label: string; severity: 'success' | 'warning' | 'error' | 'info' }> = {
    0: { label: 'Unknown', severity: 'info' },
    100: { label: 'Expiring', severity: 'warning' },
    200: { label: 'Active', severity: 'success' },
    300: { label: 'Too Small', severity: 'warning' },
    400: { label: 'Warning', severity: 'warning' },
    410: { label: 'No Upload', severity: 'warning' },
    411: { label: 'Low Match Rate', severity: 'warning' },
    412: { label: 'Invalid Data', severity: 'error' },
    414: { label: 'Replace In Progress', severity: 'info' },
    415: { label: 'Replace Failed', severity: 'error' },
    421: { label: 'No Pixel', severity: 'error' },
    422: { label: 'Pixel Not Firing', severity: 'error' },
    423: { label: 'Invalid Pixel', severity: 'error' },
    431: { label: 'Refresh Failed', severity: 'error' },
    432: { label: 'Build Failed', severity: 'error' },
    433: { label: 'Build Failed', severity: 'error' },
    434: { label: 'Retrying', severity: 'info' },
    441: { label: 'Populating', severity: 'info' },
    442: { label: 'Prefill Failed', severity: 'warning' },
    450: { label: 'Inactive', severity: 'warning' },
    470: { label: 'Account Inactive', severity: 'error' },
    471: { label: 'Flagged', severity: 'error' },
    500: { label: 'Error', severity: 'error' },
};

/**
 * Get operation status label and severity
 */
export function getOperationStatusInfo(status: OperationStatus | number | undefined): { label: string; severity: 'success' | 'warning' | 'error' | 'info' } {
    if (!status) return { label: 'Unknown', severity: 'info' };

    const code = typeof status === 'number' ? status : status.code;
    return OPERATION_STATUS_LABELS[code] ?? { label: `Status ${code}`, severity: 'info' };
}

/**
 * Get CSS class for operation status badge
 */
export function getOperationStatusClass(status: OperationStatus | number | undefined): string {
    const { severity } = getOperationStatusInfo(status);

    switch (severity) {
        case 'success': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'warning': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
}

// ============================================================================
// Delivery Status Formatting
// ============================================================================

const DELIVERY_STATUS_LABELS: Record<number, { label: string; severity: 'success' | 'warning' | 'error' | 'info' }> = {
    200: { label: 'Ready', severity: 'success' },
    300: { label: 'Too Small', severity: 'warning' },
    400: { label: 'Unusable', severity: 'error' },
};

/**
 * Get delivery status label and severity
 */
export function getDeliveryStatusInfo(status: { code: number } | undefined): { label: string; severity: 'success' | 'warning' | 'error' | 'info' } {
    if (!status?.code) return { label: 'Unknown', severity: 'info' };
    return DELIVERY_STATUS_LABELS[status.code] ?? { label: `Status ${status.code}`, severity: 'info' };
}

// ============================================================================
// Audience Subtype Formatting
// ============================================================================

const SUBTYPE_LABELS: Record<string, { label: string; icon: string }> = {
    'CUSTOM': { label: 'Customer List', icon: 'upload' },
    'WEBSITE': { label: 'Website Visitors', icon: 'globe' },
    'APP': { label: 'App Activity', icon: 'smartphone' },
    'ENGAGEMENT': { label: 'Engagement', icon: 'heart' },
    'VIDEO': { label: 'Video Viewers', icon: 'play' },
    'LOOKALIKE': { label: 'Lookalike', icon: 'users' },
    'LEAD_GEN_FORM': { label: 'Lead Form', icon: 'file-text' },
    'LEAD_AD': { label: 'Lead Ad', icon: 'file-text' },
    'INSTANT_EXPERIENCE': { label: 'Instant Experience', icon: 'zap' },
    'SHOPPING': { label: 'Shopping', icon: 'shopping-bag' },
    'IG_BUSINESS': { label: 'Instagram Business', icon: 'instagram' },
    'FB_EVENT': { label: 'Facebook Event', icon: 'calendar' },
    'OFFLINE': { label: 'Offline', icon: 'database' },
};

/**
 * Get human-readable label for audience subtype
 */
export function getAudienceSubtypeLabel(subtype: string | undefined): string {
    if (!subtype) return 'Custom';
    return SUBTYPE_LABELS[subtype]?.label ?? subtype.replace(/_/g, ' ');
}

/**
 * Get icon name for audience subtype
 */
export function getAudienceSubtypeIcon(subtype: string | undefined): string {
    if (!subtype) return 'users';
    return SUBTYPE_LABELS[subtype]?.icon ?? 'users';
}

// ============================================================================
// Date/Time Formatting
// ============================================================================

/**
 * Format timestamp for display
 */
export function formatAudienceDate(timestamp: string | undefined): string {
    if (!timestamp) return 'N/A';
    try {
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'N/A';
    }
}

/**
 * Format retention days for display
 */
export function formatRetentionDays(days: number | undefined): string {
    if (days === undefined || days === null) return 'Forever';
    if (days === 0) return 'Forever';
    if (days === 1) return '1 day';
    return `${days} days`;
}
