/**
 * Centralized Error Handling System
 * Provides structured error types with user-friendly messages
 */

// ============================================================================
// Error Codes - Organized by category for easy lookup
// ============================================================================

export enum ErrorCode {
  // Authentication Errors (1xxx)
  UNAUTHORIZED = 'AUTH_001',
  SESSION_EXPIRED = 'AUTH_002',
  INVALID_CREDENTIALS = 'AUTH_003',
  TOKEN_EXPIRED = 'AUTH_004',
  TOKEN_REFRESH_FAILED = 'AUTH_005',
  
  // OAuth Errors (2xxx)
  OAUTH_DENIED = 'OAUTH_001',
  OAUTH_STATE_MISMATCH = 'OAUTH_002',
  OAUTH_CODE_EXCHANGE_FAILED = 'OAUTH_003',
  OAUTH_TOKEN_FAILED = 'OAUTH_004',
  OAUTH_CONFIG_MISSING = 'OAUTH_005',
  
  // Platform Connection Errors (3xxx)
  PLATFORM_NOT_CONNECTED = 'PLATFORM_001',
  PLATFORM_CONNECTION_FAILED = 'PLATFORM_002',
  PLATFORM_TOKEN_INVALID = 'PLATFORM_003',
  PLATFORM_RATE_LIMITED = 'PLATFORM_004',
  PLATFORM_API_ERROR = 'PLATFORM_005',
  
  // Media Errors (4xxx)
  MEDIA_UPLOAD_FAILED = 'MEDIA_001',
  MEDIA_DOWNLOAD_FAILED = 'MEDIA_002',
  MEDIA_PROCESSING_FAILED = 'MEDIA_003',
  MEDIA_FORMAT_UNSUPPORTED = 'MEDIA_004',
  MEDIA_SIZE_EXCEEDED = 'MEDIA_005',
  MEDIA_CONTAINER_FAILED = 'MEDIA_006',
  MEDIA_PUBLISH_FAILED = 'MEDIA_007',
  MEDIA_TIMEOUT = 'MEDIA_008',
  
  // Validation Errors (5xxx)
  VALIDATION_FAILED = 'VALIDATION_001',
  MISSING_REQUIRED_FIELD = 'VALIDATION_002',
  INVALID_FORMAT = 'VALIDATION_003',
  
  // Workspace Errors (6xxx)
  WORKSPACE_NOT_FOUND = 'WORKSPACE_001',
  WORKSPACE_ACCESS_DENIED = 'WORKSPACE_002',
  
  // Export Errors (7xxx)
  EXPORT_FAILED = 'EXPORT_001',
  EXPORT_TIMEOUT = 'EXPORT_002',
  EXPORT_FORMAT_UNAVAILABLE = 'EXPORT_003',
  
  // General Errors (9xxx)
  INTERNAL_ERROR = 'INTERNAL_001',
  NETWORK_ERROR = 'NETWORK_001',
  TIMEOUT = 'TIMEOUT_001',
  UNKNOWN = 'UNKNOWN_001',
}

// ============================================================================
// User-Friendly Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, { title: string; message: string; action?: string }> = {
  // Authentication
  [ErrorCode.UNAUTHORIZED]: {
    title: 'Authentication Required',
    message: 'Please sign in to continue.',
    action: 'Sign in to your account',
  },
  [ErrorCode.SESSION_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign in again',
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    title: 'Invalid Credentials',
    message: 'The provided credentials are incorrect.',
    action: 'Check your credentials and try again',
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    title: 'Token Expired',
    message: 'Your access token has expired.',
    action: 'Reconnect your account',
  },
  [ErrorCode.TOKEN_REFRESH_FAILED]: {
    title: 'Token Refresh Failed',
    message: 'Unable to refresh your access token.',
    action: 'Please reconnect your account',
  },
  
  // OAuth
  [ErrorCode.OAUTH_DENIED]: {
    title: 'Authorization Denied',
    message: 'You denied access to connect your account.',
    action: 'Try connecting again and approve the permissions',
  },
  [ErrorCode.OAUTH_STATE_MISMATCH]: {
    title: 'Security Check Failed',
    message: 'The authorization request could not be verified.',
    action: 'Please try connecting again',
  },
  [ErrorCode.OAUTH_CODE_EXCHANGE_FAILED]: {
    title: 'Connection Failed',
    message: 'Unable to complete the authorization process.',
    action: 'Please try connecting again',
  },
  [ErrorCode.OAUTH_TOKEN_FAILED]: {
    title: 'Token Error',
    message: 'Unable to obtain access token from the platform.',
    action: 'Please try connecting again',
  },
  [ErrorCode.OAUTH_CONFIG_MISSING]: {
    title: 'Configuration Error',
    message: 'Platform configuration is missing.',
    action: 'Contact support for assistance',
  },
  
  // Platform
  [ErrorCode.PLATFORM_NOT_CONNECTED]: {
    title: 'Account Not Connected',
    message: 'This platform is not connected to your account.',
    action: 'Connect your account in Settings',
  },
  [ErrorCode.PLATFORM_CONNECTION_FAILED]: {
    title: 'Connection Failed',
    message: 'Unable to connect to the platform.',
    action: 'Check your internet connection and try again',
  },
  [ErrorCode.PLATFORM_TOKEN_INVALID]: {
    title: 'Invalid Token',
    message: 'Your platform access token is no longer valid.',
    action: 'Reconnect your account',
  },
  [ErrorCode.PLATFORM_RATE_LIMITED]: {
    title: 'Rate Limited',
    message: 'Too many requests. Please wait before trying again.',
    action: 'Wait a few minutes and try again',
  },
  [ErrorCode.PLATFORM_API_ERROR]: {
    title: 'Platform Error',
    message: 'The platform returned an error.',
    action: 'Try again or contact support if the issue persists',
  },
  
  // Media
  [ErrorCode.MEDIA_UPLOAD_FAILED]: {
    title: 'Upload Failed',
    message: 'Unable to upload your media file.',
    action: 'Check your file and try again',
  },
  [ErrorCode.MEDIA_DOWNLOAD_FAILED]: {
    title: 'Download Failed',
    message: 'Unable to download the media file.',
    action: 'Check your internet connection and try again',
  },
  [ErrorCode.MEDIA_PROCESSING_FAILED]: {
    title: 'Processing Failed',
    message: 'Unable to process your media file.',
    action: 'Try a different file format',
  },
  [ErrorCode.MEDIA_FORMAT_UNSUPPORTED]: {
    title: 'Unsupported Format',
    message: 'This media format is not supported.',
    action: 'Use a supported format (JPG, PNG, MP4)',
  },
  [ErrorCode.MEDIA_SIZE_EXCEEDED]: {
    title: 'File Too Large',
    message: 'Your file exceeds the maximum size limit.',
    action: 'Reduce the file size and try again',
  },
  [ErrorCode.MEDIA_CONTAINER_FAILED]: {
    title: 'Media Container Error',
    message: 'Unable to prepare your media for posting.',
    action: 'Try again or use a different file',
  },
  [ErrorCode.MEDIA_PUBLISH_FAILED]: {
    title: 'Publish Failed',
    message: 'Unable to publish your content.',
    action: 'Check your account connection and try again',
  },
  [ErrorCode.MEDIA_TIMEOUT]: {
    title: 'Processing Timeout',
    message: 'Media processing took too long.',
    action: 'Try again with a smaller file',
  },
  
  // Validation
  [ErrorCode.VALIDATION_FAILED]: {
    title: 'Validation Error',
    message: 'The provided data is invalid.',
    action: 'Check your input and try again',
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    title: 'Missing Information',
    message: 'Required information is missing.',
    action: 'Fill in all required fields',
  },
  [ErrorCode.INVALID_FORMAT]: {
    title: 'Invalid Format',
    message: 'The data format is incorrect.',
    action: 'Check the format and try again',
  },
  
  // Workspace
  [ErrorCode.WORKSPACE_NOT_FOUND]: {
    title: 'Workspace Not Found',
    message: 'The workspace could not be found.',
    action: 'Select a different workspace',
  },
  [ErrorCode.WORKSPACE_ACCESS_DENIED]: {
    title: 'Access Denied',
    message: 'You do not have access to this workspace.',
    action: 'Request access from the workspace owner',
  },
  
  // Export
  [ErrorCode.EXPORT_FAILED]: {
    title: 'Export Failed',
    message: 'Unable to export your design.',
    action: 'Try again or use a different format',
  },
  [ErrorCode.EXPORT_TIMEOUT]: {
    title: 'Export Timeout',
    message: 'The export took too long to complete.',
    action: 'Try again with a simpler design',
  },
  [ErrorCode.EXPORT_FORMAT_UNAVAILABLE]: {
    title: 'Format Unavailable',
    message: 'The requested export format is not available.',
    action: 'Choose a different format',
  },
  
  // General
  [ErrorCode.INTERNAL_ERROR]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    action: 'Try again or contact support',
  },
  [ErrorCode.NETWORK_ERROR]: {
    title: 'Network Error',
    message: 'Unable to connect to the server.',
    action: 'Check your internet connection',
  },
  [ErrorCode.TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    action: 'Try again',
  },
  [ErrorCode.UNKNOWN]: {
    title: 'Unknown Error',
    message: 'An unknown error occurred.',
    action: 'Try again or contact support',
  },
};

// ============================================================================
// AppError Class - Structured error with user-friendly info
// ============================================================================

export interface AppErrorDetails {
  code: ErrorCode;
  title: string;
  message: string;
  action?: string;
  technicalDetails?: string;
  context?: Record<string, unknown>;
  statusCode?: number;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly title: string;
  public readonly userMessage: string;
  public readonly action?: string;
  public readonly technicalDetails?: string;
  public readonly context?: Record<string, unknown>;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    options?: {
      technicalDetails?: string;
      context?: Record<string, unknown>;
      statusCode?: number;
      overrideMessage?: string;
    }
  ) {
    const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];
    super(options?.overrideMessage || errorInfo.message);

    this.code = code;
    this.title = errorInfo.title;
    this.userMessage = options?.overrideMessage || errorInfo.message;
    this.action = errorInfo.action;
    this.technicalDetails = options?.technicalDetails;
    this.context = options?.context;
    this.statusCode = options?.statusCode || 500;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace
    Error.captureStackTrace?.(this, AppError);
  }

  /**
   * Convert to a user-friendly response object
   */
  toUserResponse(): AppErrorDetails {
    return {
      code: this.code,
      title: this.title,
      message: this.userMessage,
      action: this.action,
      statusCode: this.statusCode,
    };
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        title: this.title,
        message: this.userMessage,
        action: this.action,
      },
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }

  /**
   * Log error details (for server-side logging)
   */
  toLogFormat(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      technicalDetails: this.technicalDetails,
      context: this.context,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create an AppError from a caught error
 */
export function createAppError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Try to detect error type from message
  const detectedCode = detectErrorCode(errorMessage) || defaultCode;

  return new AppError(detectedCode, {
    technicalDetails: errorMessage,
    context: error instanceof Error ? { originalError: error.name } : undefined,
  });
}

/**
 * Detect error code from error message
 */
function detectErrorCode(message: string): ErrorCode | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authenticated')) {
    return ErrorCode.UNAUTHORIZED;
  }
  if (lowerMessage.includes('token') && lowerMessage.includes('expired')) {
    return ErrorCode.TOKEN_EXPIRED;
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return ErrorCode.PLATFORM_RATE_LIMITED;
  }
  if (lowerMessage.includes('timeout')) {
    return ErrorCode.TIMEOUT;
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
    return ErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('not connected')) {
    return ErrorCode.PLATFORM_NOT_CONNECTED;
  }

  return null;
}

// ============================================================================
// API Response Helpers
// ============================================================================

import { NextResponse } from 'next/server';

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(error: unknown, defaultCode?: ErrorCode): NextResponse {
  const appError = createAppError(error, defaultCode);
  
  // Log error for debugging (only in development or for severe errors)
  if (process.env.NODE_ENV === 'development' || appError.statusCode >= 500) {
    console.error('[AppError]', appError.toLogFormat());
  }

  return NextResponse.json(appError.toJSON(), { status: appError.statusCode });
}

/**
 * Create a success response with consistent structure
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// ============================================================================
// Platform-Specific Error Helpers
// ============================================================================

export function createPlatformError(
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'twitter' | 'canva',
  apiError: unknown,
  operation: string
): AppError {
  const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
  
  return new AppError(ErrorCode.PLATFORM_API_ERROR, {
    technicalDetails: `${platform.toUpperCase()} API error during ${operation}: ${errorMessage}`,
    context: { platform, operation },
    statusCode: 502,
  });
}

export function createMediaError(
  operation: 'upload' | 'download' | 'process' | 'publish',
  details: string
): AppError {
  const codeMap: Record<string, ErrorCode> = {
    upload: ErrorCode.MEDIA_UPLOAD_FAILED,
    download: ErrorCode.MEDIA_DOWNLOAD_FAILED,
    process: ErrorCode.MEDIA_PROCESSING_FAILED,
    publish: ErrorCode.MEDIA_PUBLISH_FAILED,
  };

  return new AppError(codeMap[operation], {
    technicalDetails: details,
    context: { operation },
  });
}

export function createAuthError(
  type: 'unauthorized' | 'expired' | 'invalid' | 'oauth_denied',
  details?: string
): AppError {
  const codeMap: Record<string, ErrorCode> = {
    unauthorized: ErrorCode.UNAUTHORIZED,
    expired: ErrorCode.TOKEN_EXPIRED,
    invalid: ErrorCode.INVALID_CREDENTIALS,
    oauth_denied: ErrorCode.OAUTH_DENIED,
  };

  return new AppError(codeMap[type], {
    technicalDetails: details,
    statusCode: 401,
  });
}
