/**
 * Server-side Credential Service
 * Single source of truth for credentials (database-backed only)
 * Proper encryption/decryption with workspace-specific keys
 * Token refresh handling
 */

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import {
  encryptCredentials,
  decryptCredentials,
  getOrCreateWorkspaceEncryptionKey,
} from '@/lib/auth/encryptionManager'
import { logAuditEvent } from './auditLogService'
import type { Platform } from '@/types'

// Don't cache supabase instance in serverless - create fresh each time
async function getSupabase() {
  return await createServerClient()
}

// Get admin client for cron/scheduled operations (bypasses RLS)
async function getSupabaseAdmin() {
  return await createAdminClient()
}

export class CredentialService {
  /**
   * Save platform credentials to database
   * Encrypts using workspace-specific key
   */
  static async savePlatformCredentials(
    platform: Platform,
    credentials: any,
    userId: string,
    workspaceId: string,
    options: { pageId?: string; pageName?: string } = {}
  ): Promise<void> {
    try {
      const supabase = await getSupabase()

      // Get encryption key for this workspace
      const encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)

      // Encrypt credentials
      const encryptedData = await encryptCredentials(credentials, encryptionKey)

      // Check if already exists
      const { data: existing, error: checkError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }
      

      // Prepare common data
      const commonData = {
        credentials_encrypted: encryptedData,
        is_connected: credentials.isConnected ?? true,
        username: credentials.username || null,
        expires_at: credentials.expiresAt || null,
        last_refreshed_at: new Date().toISOString(),
        refresh_token_encrypted: credentials.refreshToken
          ? await encryptCredentials(
              { token: credentials.refreshToken },
              encryptionKey
            )
          : null,
        page_id: options.pageId || null,
        page_name: options.pageName || null,
        connected_at: credentials.isConnected ? new Date().toISOString() : null,
        refresh_error_count: 0,
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await (supabase
          .from('social_accounts') as any)
          .update(commonData)
          .eq('id', (existing as any).id)

        if (updateError) {
          throw updateError
        }


        // Log audit
        await logAuditEvent({
          workspaceId,
          userId,
          platform,
          action: 'credentials_updated',
          status: 'success',
        })
      } else {
        // Insert new
        const { error: insertError } = await (supabase.from('social_accounts') as any).insert({
          workspace_id: workspaceId,
          platform,
          ...commonData,
        })

        if (insertError) {
          throw insertError
        }


        await logAuditEvent({
          workspaceId,
          userId,
          platform,
          action: 'platform_connected',
          status: 'success',
        })
      }
    } catch (error) {

      await logAuditEvent({
        workspaceId,
        userId,
        platform,
        action: 'credentials_save_failed',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'SAVE_ERROR',
      }).catch(() => {})

      throw error
    }
  }

  /**
   * Get credentials for a specific platform
   * @param platform - The social media platform
   * @param userId - The user ID (for logging)
   * @param workspaceId - The workspace ID to look up credentials for
   * @param options - Optional settings
   * @param options.useAdmin - Use admin client (bypasses RLS) for cron/scheduled operations
   */
  static async getPlatformCredentials(
    platform: Platform,
    userId: string,
    workspaceId: string,
    options: { useAdmin?: boolean } = {}
  ): Promise<any | null> {
    try {
      
      // Use admin client for cron/scheduled operations to bypass RLS
      const supabase = options.useAdmin ? await getSupabaseAdmin() : await getSupabase()
      
      const { data, error } = await (supabase
        .from('social_accounts') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .maybeSingle()

      if (error) {
        return null
      }
      
      if (!data) {
        return null
      }


      if (!(data as any).credentials_encrypted) {
        return null
      }

      // Decrypt credentials
      let credentials: any
      let encryptionKey: Buffer
      try {
        encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
        credentials = await decryptCredentials((data as any).credentials_encrypted, encryptionKey)
      } catch (decryptError) {
        return null
      }
      

      // Decrypt refresh token if exists
      let refreshToken = null
      if ((data as any).refresh_token_encrypted) {
        try {
          const decryptedRefresh = await decryptCredentials(
            (data as any).refresh_token_encrypted,
            encryptionKey
          )
          refreshToken = decryptedRefresh.token
        } catch (err) {
        }
      }

      return {
        ...credentials,
        refreshToken,
        expiresAt: (data as any).expires_at,
        pageId: (data as any).page_id,
        pageName: (data as any).page_name,
        isConnected: (data as any).is_connected,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get credentials for multiple platforms in a single batch operation
   * More efficient than calling getPlatformCredentials multiple times
   * Uses a single DB query and single encryption key fetch
   * 
   * @param platforms - Array of platforms to fetch credentials for
   * @param userId - The user ID (for logging)
   * @param workspaceId - The workspace ID to look up credentials for
   * @param options - Optional settings
   * @param options.useAdmin - Use admin client (bypasses RLS) for cron/scheduled operations
   * @returns Map of platform to credentials (null if not found)
   */
  static async getMultiplePlatformCredentials(
    platforms: Platform[],
    userId: string,
    workspaceId: string,
    options: { useAdmin?: boolean } = {}
  ): Promise<Map<Platform, any>> {
    const result = new Map<Platform, any>()
    
    // Initialize all requested platforms with null
    for (const platform of platforms) {
      result.set(platform, null)
    }

    if (platforms.length === 0) {
      return result
    }

    try {
      // Use admin client for cron/scheduled operations to bypass RLS
      const supabase = options.useAdmin ? await getSupabaseAdmin() : await getSupabase()
      
      // Single DB query for all platforms
      const { data, error } = await (supabase
        .from('social_accounts') as any)
        .select('*')
        .eq('workspace_id', workspaceId)
        .in('platform', platforms)

      if (error || !data || data.length === 0) {
        return result
      }

      // Fetch encryption key ONCE for all platforms
      let encryptionKey: Buffer | null = null
      try {
        encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
      } catch (keyError) {
        // If we can't get the key, return empty results
        return result
      }

      // Process each account record
      for (const record of data) {
        const platform = record.platform as Platform
        
        if (!record.credentials_encrypted) {
          continue
        }

        try {
          // Decrypt credentials
          const credentials = await decryptCredentials(record.credentials_encrypted, encryptionKey)
          
          // Decrypt refresh token if exists
          let refreshToken = null
          if (record.refresh_token_encrypted) {
            try {
              const decryptedRefresh = await decryptCredentials(
                record.refresh_token_encrypted,
                encryptionKey
              )
              refreshToken = decryptedRefresh.token
            } catch (err) {
              // Ignore refresh token decryption errors
            }
          }

          result.set(platform, {
            ...credentials,
            refreshToken,
            expiresAt: record.expires_at,
            pageId: record.page_id,
            pageName: record.page_name,
            channelId: record.page_id,
            channelTitle: record.page_name,
            isConnected: record.is_connected,
          })
        } catch (decryptError) {
          // Skip this platform if decryption fails
        }
      }

      return result
    } catch (error) {
      return result
    }
  }

  /**
   * Verify and refresh token if needed
   * @param options.useAdmin - Use admin client (bypasses RLS) for cron/scheduled operations
   */
  static async verifyAndRefreshToken(
    platform: Platform,
    userId: string,
    workspaceId: string,
    refreshFunction?: (credentials: any) => Promise<any>,
    options: { useAdmin?: boolean } = {}
  ): Promise<any> {
    try {
      const credentials = await this.getPlatformCredentials(platform, userId, workspaceId, options)

      if (!credentials) {
        throw new Error(`No credentials found for ${platform}`)
      }


      // Check if token is expired
      const now = Date.now()
      let isExpired = false
      
      if (credentials.expiresAt) {
        const expiresAt = new Date(credentials.expiresAt).getTime()
        isExpired = now > expiresAt
      } else {
        // If no expiresAt, assume token might be expired and try to refresh if possible
        isExpired = !!credentials.refreshToken // Only mark as expired if we can refresh
      }

      if (isExpired) {
        // Token expired, try to refresh
        if (refreshFunction && credentials.refreshToken) {
          try {
            const newCredentials = await refreshFunction(credentials)


            // Save refreshed credentials
            await this.savePlatformCredentials(
              platform,
              newCredentials,
              userId,
              workspaceId
            )

            await logAuditEvent({
              workspaceId,
              userId,
              platform,
              action: 'token_refreshed',
              status: 'success',
            })

            return newCredentials
          } catch (refreshError) {
            
            await logAuditEvent({
              workspaceId,
              userId,
              platform,
              action: 'token_refresh_failed',
              status: 'failed',
              errorMessage:
                refreshError instanceof Error ? refreshError.message : String(refreshError),
              errorCode: 'REFRESH_ERROR',
            })

            throw new Error(
              `Token refresh failed: ${
                refreshError instanceof Error ? refreshError.message : String(refreshError)
              }`
            )
          }
        } else {
          throw new Error('Token expired and no refresh token available')
        }
      }

      return credentials
    } catch (error) {
      throw error
    }
  }

  /**
   * Disconnect platform
   * Deletes the credential record for the specific platform
   * Only removes the platform credential being disconnected
   */
  static async disconnectPlatform(
    platform: Platform,
    userId: string,
    workspaceId: string
  ): Promise<void> {
    try {
      const supabase = await getSupabase()

      // Delete only the credential record for this specific platform
      const { error } = await (supabase
        .from('social_accounts') as any)
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)

      if (error) throw error

      await logAuditEvent({
        workspaceId,
        userId,
        platform,
        action: 'platform_disconnected',
        status: 'success',
      })
    } catch (error) {

      await logAuditEvent({
        workspaceId,
        userId,
        platform,
        action: 'disconnect_failed',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'DISCONNECT_ERROR',
      }).catch(() => {})

      throw error
    }
  }

  /**
   * Get connection status for all platforms
   */
  static async getConnectionStatus(
    workspaceId: string
  ): Promise<Record<Platform, any>> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await (supabase
        .from('social_accounts') as any)
        .select('platform, is_connected, username, page_name, expires_at, credentials_encrypted')
        .eq('workspace_id', workspaceId)

      if (error) {
        throw error
      }


      const status: Record<string, any> = {
        twitter: { isConnected: false },
        linkedin: { isConnected: false },
        facebook: { isConnected: false },
        instagram: { isConnected: false },
        tiktok: { isConnected: false },
        youtube: { isConnected: false },
      }

      // Fetch encryption key ONCE outside the loop for efficiency
      let encryptionKey: Buffer | null = null
      const platformsNeedingDecryption = (data || []).filter((account: any) => {
        const hasCredentials = account.credentials_encrypted && account.credentials_encrypted.length > 0
        const platform = account.platform
        // Only LinkedIn and Facebook need decryption for extra fields
        return hasCredentials && (platform === 'linkedin' || platform === 'facebook')
      })

      if (platformsNeedingDecryption.length > 0) {
        try {
          encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
        } catch (keyError) {
          // Continue without decryption if key fetch fails
        }
      }

      for (const account of data || []) {
        // ✅ Simple logic: Only check if credentials exist
        const hasCredentials =
          (account as any).credentials_encrypted &&
          (account as any).credentials_encrypted.length > 0;

        const platform = (account as any).platform;
        const expiresAt = (account as any).expires_at;

        const statusEntry: any = {
          isConnected: hasCredentials,
          username: (account as any).username || (account as any).page_name,
          expiresAt: expiresAt ? (typeof expiresAt === 'string' ? expiresAt : expiresAt.toISOString()) : null,
        };

        // For LinkedIn, include organization info if available
        if (platform === 'linkedin' && hasCredentials && encryptionKey) {
          try {
            // Decrypt credentials to get organization info
            const encryptedData = (account as any).credentials_encrypted;
            if (encryptedData) {
              const decrypted = await decryptCredentials(encryptedData, encryptionKey);
              if (decrypted) {
                statusEntry.organizationId = decrypted.organizationId || null;
                statusEntry.organizationName = decrypted.organizationName || null;
                statusEntry.postToPage = decrypted.postToPage ?? false;
                statusEntry.profileName = decrypted.profileName || null;
              }
            }
          } catch (decryptError) {
          }
        }

        // For Facebook, include page and ad account info for Meta Ads
        if (platform === 'facebook' && hasCredentials && encryptionKey) {
          try {
            const encryptedData = (account as any).credentials_encrypted;
            if (encryptedData) {
              const decrypted = await decryptCredentials(encryptedData, encryptionKey);
              if (decrypted) {
                statusEntry.pageId = decrypted.pageId || null;
                statusEntry.pageName = decrypted.pageName || null;
                statusEntry.adAccountId = decrypted.adAccountId || null;
                statusEntry.adAccountName = decrypted.adAccountName || null;
                statusEntry.connectedAt = decrypted.connectedAt || null;
              }
            }
          } catch (decryptError) {
          }
        }

        (status as any)[platform] = statusEntry;
        
      }

      return status
    } catch (error) {
      return {
        twitter: { isConnected: false },
        linkedin: { isConnected: false },
        facebook: { isConnected: false },
        instagram: { isConnected: false },
        tiktok: { isConnected: false },
        youtube: { isConnected: false },
      }
    }
  }

  /**
   * Delete platform credentials completely
   */
  static async deletePlatformCredentials(
    platform: Platform,
    workspaceId: string
  ): Promise<void> {
    try {
      const supabase = await getSupabase()
      const { error } = await (supabase
        .from('social_accounts') as any)
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)

      if (error) throw error
    } catch (error) {
      throw error
    }
  }

  /**
   * Clean up invalid credentials (marked connected but with no actual credentials or expired)
   * Run this on startup or periodically to fix orphaned records
   */
  static async cleanupInvalidCredentials(workspaceId: string): Promise<void> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await (supabase
        .from('social_accounts') as any)
        .select('id, is_connected, expires_at, credentials_encrypted')
        .eq('workspace_id', workspaceId)

      if (error) throw error

      const now = Date.now()
      const recordsToClean = (data || []).filter((record: any) => {
        // Mark for cleanup if:
        // 1. is_connected is true but no credentials exist
        // 2. is_connected is true but token expired
        const hasCredentials = record.credentials_encrypted && record.credentials_encrypted.length > 0
        const isExpired = record.expires_at
          ? new Date(record.expires_at).getTime() <= now
          : false

        return record.is_connected && (!hasCredentials || isExpired)
      })

      // Update invalid records to is_connected: false
      for (const record of recordsToClean) {
        await (supabase.from('social_accounts') as any)
          .update({ is_connected: false })
          .eq('id', record.id)
      }

      if (recordsToClean.length > 0) {
      }
    } catch (error) {
    }
  }

  /**
   * Get all connection statuses
   */
  static async getAllCredentialsStatus(
    workspaceId: string
  ): Promise<Array<{ platform: Platform; isConnected: boolean; username?: string }>> {
    try {
      const supabase = await getSupabase()
      const { data, error } = await (supabase
        .from('social_accounts') as any)
        .select('platform, is_connected, username, page_name, expires_at, credentials_encrypted')
        .eq('workspace_id', workspaceId)

      if (error) throw error

      const now = Date.now()

      return (data || [])
        .map((account: any) => {
          // ✅ Verify credentials actually exist
          const hasCredentials = account.credentials_encrypted &&
                                 account.credentials_encrypted.length > 0

          // ✅ Check if token has expired
          const expiresAt = account.expires_at
            ? new Date(account.expires_at).getTime()
            : null
          const isExpired = expiresAt && expiresAt <= now

          // ✅ Only mark as connected if credentials exist and not expired
          const isActuallyConnected = account.is_connected &&
                                      hasCredentials &&
                                      !isExpired

          return {
            platform: account.platform as Platform,
            isConnected: isActuallyConnected,
            username: account.username || account.page_name,
          }
        })
    } catch (error) {
      return []
    }
  }

  /**
   * Instance methods for use with injected Supabase client
   * These wrap the static methods but allow passing a Supabase instance
   */
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async savePlatformCredentials(
    workspaceId: string,
    platform: Platform,
    credentials: any,
    options: { pageId?: string; pageName?: string } = {}
  ): Promise<any> {
    try {
      // Get encryption key for this workspace
      const encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)

      // Encrypt credentials
      const encryptedData = await encryptCredentials(credentials, encryptionKey)

      // Check if already exists
      const { data: existing, error: checkError } = await this.supabase
        .from('social_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .maybeSingle()

      if (checkError) throw checkError

      // Prepare common data
      const commonData = {
        credentials_encrypted: encryptedData,
        is_connected: credentials.isConnected ?? true,
        username: credentials.username || credentials.displayName || credentials.channelTitle || null,
        expires_at: credentials.expiresAt || null,
        last_refreshed_at: new Date().toISOString(),
        refresh_token_encrypted: credentials.refreshToken
          ? await encryptCredentials(
              { token: credentials.refreshToken },
              encryptionKey
            )
          : null,
        page_id: options.pageId || credentials.pageId || credentials.channelId || null,
        page_name: options.pageName || credentials.pageName || credentials.channelTitle || null,
        connected_at: credentials.isConnected ? new Date().toISOString() : null,
        refresh_error_count: 0,
      }

      if (existing) {
        // Update existing
        const { data: updated, error: updateError } = await this.supabase
          .from('social_accounts')
          .update(commonData)
          .eq('id', (existing as any).id)
          .select()

        if (updateError) throw updateError
        return updated?.[0]
      } else {
        // Insert new
        const { data: inserted, error: insertError } = await this.supabase
          .from('social_accounts')
          .insert({
            workspace_id: workspaceId,
            platform,
            ...commonData,
          })
          .select()

        if (insertError) throw insertError
        return inserted?.[0]
      }
    } catch (error) {
      throw error
    }
  }

  async getPlatformCredentials(
    workspaceId: string,
    platform: Platform
  ): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('platform', platform)
        .maybeSingle()

      if (error || !data) return null

      // Decrypt credentials
      const encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
      const credentials = await decryptCredentials((data as any).credentials_encrypted, encryptionKey)

      // Decrypt refresh token if exists
      let refreshToken = null
      if ((data as any).refresh_token_encrypted) {
        try {
          const decryptedRefresh = await decryptCredentials(
            (data as any).refresh_token_encrypted,
            encryptionKey
          )
          refreshToken = decryptedRefresh.token
        } catch (err) {
        }
      }

      return {
        ...credentials,
        refreshToken,
        expiresAt: (data as any).expires_at,
        pageId: (data as any).page_id,
        pageName: (data as any).page_name,
        channelId: (data as any).page_id,
        channelTitle: (data as any).page_name,
        isConnected: (data as any).is_connected,
      }
    } catch (error) {
      return null
    }
  }

  async verifyAndRefreshToken(
    workspaceId: string,
    platform: Platform,
    refreshFunction?: (credentials: any) => Promise<any>
  ): Promise<any> {
    try {
      const credentials = await this.getPlatformCredentials(workspaceId, platform)

      if (!credentials) {
        throw new Error(`No credentials found for ${platform}`)
      }

      // Check if token is expired
      if (credentials.expiresAt) {
        const expiresAt = new Date(credentials.expiresAt).getTime()
        const now = Date.now()

        if (now > expiresAt) {
          // Token expired, try to refresh
          if (refreshFunction && credentials.refreshToken) {
            try {
              const newCredentials = await refreshFunction(credentials)

              // Save refreshed credentials
              await this.savePlatformCredentials(
                workspaceId,
                platform,
                newCredentials
              )

              return newCredentials
            } catch (refreshError) {
              throw new Error(
                `Token refresh failed: ${
                  refreshError instanceof Error ? refreshError.message : String(refreshError)
                }`
              )
            }
          } else {
            throw new Error('Token expired and no refresh token available')
          }
        }
      }

      return credentials
    } catch (error) {
      throw error
    }
  }
}
