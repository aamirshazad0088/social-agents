/**
 * Auth API
 * 
 * API client for authentication operations.
 * Note: Primary authentication is handled via Supabase Auth,
 * this module provides backend authentication endpoints.
 */

import { get, post } from '../client';
import { ENDPOINTS } from '../config';
import type {
    LoginRequest,
    AuthResponse,
    TokenResponse,
} from '../types';

/**
 * Login with credentials
 * 
 * Authenticates a user with email and password.
 * Note: This is typically handled by Supabase Auth directly.
 * 
 * @param credentials - Login credentials
 * @returns Promise resolving to auth response
 */
export async function login(
    credentials: LoginRequest
): Promise<AuthResponse> {
    return post<AuthResponse>(`${ENDPOINTS.auth.base}/login`, credentials);
}

/**
 * Logout current user
 * 
 * Invalidates the current session.
 * 
 * @returns Promise resolving when logout is complete
 */
export async function logout(): Promise<{ success: boolean }> {
    return post<{ success: boolean }>(`${ENDPOINTS.auth.base}/logout`, {});
}

/**
 * Refresh access token
 * 
 * Obtains a new access token using the refresh token.
 * 
 * @returns Promise resolving to new token response
 */
export async function refreshToken(): Promise<TokenResponse> {
    return post<TokenResponse>(`${ENDPOINTS.auth.base}/refresh`, {});
}

/**
 * Get current user info
 * 
 * Retrieves information about the currently authenticated user.
 * 
 * @returns Promise resolving to user info
 */
export async function getCurrentUser(): Promise<{
    id: string;
    email: string;
    workspaceId?: string;
    role?: string;
}> {
    return get(`${ENDPOINTS.auth.base}/me`);
}

/**
 * Verify authentication status
 * 
 * Checks if the current session is valid.
 * 
 * @returns Promise resolving to auth status
 */
export async function verifyAuth(): Promise<{
    authenticated: boolean;
    userId?: string;
    workspaceId?: string;
}> {
    return get(`${ENDPOINTS.auth.base}/verify`);
}
