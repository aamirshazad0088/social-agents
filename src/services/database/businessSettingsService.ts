/**
 * Business Settings Service
 * Handles CRUD operations for business settings stored in workspaces.business_settings JSONB
 * 
 * Business settings are per-workspace and used by AI for content personalization.
 * Optional fields are stored as null when not provided.
 */

import { createServerClient } from '@/lib/supabase/server'
import { BusinessInfo } from '@/types/businessInfo.types'

// Create fresh supabase client for each request
async function getSupabase() {
  return await createServerClient()
}

export class BusinessSettingsService {
  /**
   * Get business settings for a workspace
   * @param workspaceId - The workspace to get settings for
   * @returns BusinessInfo or null if not set
   */
  static async getBusinessSettings(workspaceId: string): Promise<BusinessInfo | null> {
    try {
      const supabase = await getSupabase()
      
      const { data, error } = await supabase
        .from('workspaces')
        .select('business_settings')
        .eq('id', workspaceId)
        .single()

      if (error) {
        return null
      }

      // Return null if no settings exist
      const workspaceData = data as { business_settings: BusinessInfo | null } | null
      if (!workspaceData || !workspaceData.business_settings) {
        return null
      }

      return workspaceData.business_settings
    } catch (error) {
      return null
    }
  }

  /**
   * Save or update business settings for a workspace
   * @param workspaceId - The workspace to save settings for
   * @param settings - The business settings to save
   * @param userId - User making the change (for audit)
   * @returns The saved BusinessInfo or null if failed
   */
  static async saveBusinessSettings(
    workspaceId: string,
    settings: BusinessInfo,
    userId: string
  ): Promise<BusinessInfo | null> {
    try {
      const supabase = await getSupabase()

      // Clean settings - convert empty strings and empty arrays to null for optional fields
      const cleanedSettings = this.cleanSettingsForStorage(settings)

      const { data, error } = await (supabase
        .from('workspaces') as any)
        .update({
          business_settings: cleanedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
        .select('business_settings')
        .single()

      if (error) {
        return null
      }

      // Log activity
      await this.logActivity(workspaceId, userId, 'update', 'business_settings', workspaceId)

      return data?.business_settings as BusinessInfo
    } catch (error) {
      return null
    }
  }

  /**
   * Clear business settings for a workspace
   * @param workspaceId - The workspace to clear settings for
   * @param userId - User making the change (for audit)
   * @returns Success boolean
   */
  static async clearBusinessSettings(
    workspaceId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const supabase = await getSupabase()

      const { error } = await (supabase
        .from('workspaces') as any)
        .update({
          business_settings: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)

      if (error) {
        return false
      }

      // Log activity
      await this.logActivity(workspaceId, userId, 'delete', 'business_settings', workspaceId)

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Clean settings for storage - convert empty values to null for optional fields
   * This ensures optional fields are stored as null, not empty strings/arrays
   */
  private static cleanSettingsForStorage(settings: BusinessInfo): BusinessInfo {
    const cleaned: any = {
      ...settings,
      updatedAt: new Date().toISOString(),
    }

    // Convert empty strings to null for optional string fields
    const optionalStringFields = ['website', 'primarySocialPlatform', 'brandDescription', 'targetMarket']
    for (const field of optionalStringFields) {
      if (cleaned[field] === '' || cleaned[field] === undefined) {
        cleaned[field] = null
      }
    }

    // Convert empty arrays to null for optional array fields
    const optionalArrayFields = [
      'uniqueSellingPoints', 'brandValues', 'mainProducts', 
      'geographicFocus', 'preferredTone', 'contentGoals', 'brandColors'
    ]
    for (const field of optionalArrayFields) {
      if (!cleaned[field] || (Array.isArray(cleaned[field]) && cleaned[field].length === 0)) {
        cleaned[field] = null
      }
    }

    // Convert undefined optional enum fields to null
    if (!cleaned.priceRange) cleaned.priceRange = null
    if (!cleaned.visualStyle) cleaned.visualStyle = null

    return cleaned as BusinessInfo
  }

  /**
   * Log activity to activity_logs table
   */
  private static async logActivity(
    workspaceId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    try {
      const supabase = await getSupabase()
      await (supabase.from('activity_logs') as any).insert({
        workspace_id: workspaceId,
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
      })
    } catch (error) {
      // Don't throw - activity logging shouldn't break the main operation
    }
  }
}
