/**
 * Generation History Service - Supabase Database Operations
 * Tracks all AI generation activities (images & videos)
 */

import { createServerClient } from '@/lib/supabase/server'

let supabaseInstance: any = null

async function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = await createServerClient()
  }
  return supabaseInstance
}

// ============================================================================
// Types
// ============================================================================

export type GenerationType = 'image' | 'video'
export type GenerationAction = 
  | 'generate' 
  | 'edit' 
  | 'inpaint' 
  | 'variation' 
  | 'reference' 
  | 'image-to-video' 
  | 'remix'
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface GenerationHistoryItem {
  id: string
  workspace_id: string
  user_id: string
  type: GenerationType
  action: GenerationAction
  status: GenerationStatus
  prompt: string
  revised_prompt?: string
  model: string
  config: Record<string, any>
  input_media_urls?: string[]
  output_media_url?: string
  output_media_id?: string
  error_message?: string
  generation_time_ms?: number
  api_request_id?: string
  created_at: string
  completed_at?: string
}

export interface CreateHistoryInput {
  type: GenerationType
  action: GenerationAction
  prompt: string
  model: string
  config: Record<string, any>
  inputMediaUrls?: string[]
}

export interface UpdateHistoryInput {
  status?: GenerationStatus
  revisedPrompt?: string
  outputMediaUrl?: string
  outputMediaId?: string
  errorMessage?: string
  generationTimeMs?: number
  apiRequestId?: string
}

export interface HistoryFilters {
  type?: GenerationType
  action?: GenerationAction
  status?: GenerationStatus
  limit?: number
  offset?: number
  fromDate?: string
  toDate?: string
}

// ============================================================================
// Service Class
// ============================================================================

export class GenerationHistoryService {
  /**
   * Create a new history entry when generation starts
   */
  static async createHistoryEntry(
    input: CreateHistoryInput,
    userId: string,
    workspaceId: string
  ): Promise<GenerationHistoryItem> {
    try {
      const supabase = await getSupabase()

      const historyItem = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        user_id: userId,
        type: input.type,
        action: input.action,
        status: 'processing' as GenerationStatus,
        prompt: input.prompt,
        model: input.model,
        config: input.config,
        input_media_urls: input.inputMediaUrls || null,
        created_at: new Date().toISOString(),
      }

      const { data, error } = await (supabase
        .from('generation_history') as any)
        .insert([historyItem])
        .select()
        .single()

      if (error) throw error

      return data as GenerationHistoryItem
    } catch (error) {
      throw error
    }
  }

  /**
   * Update history entry on completion or failure
   */
  static async updateHistoryEntry(
    historyId: string,
    updates: UpdateHistoryInput,
    workspaceId: string
  ): Promise<GenerationHistoryItem> {
    try {
      const supabase = await getSupabase()

      const updateData: any = {}

      if (updates.status) updateData.status = updates.status
      if (updates.revisedPrompt) updateData.revised_prompt = updates.revisedPrompt
      if (updates.outputMediaUrl) updateData.output_media_url = updates.outputMediaUrl
      if (updates.outputMediaId) updateData.output_media_id = updates.outputMediaId
      if (updates.errorMessage) updateData.error_message = updates.errorMessage
      if (updates.generationTimeMs) updateData.generation_time_ms = updates.generationTimeMs
      if (updates.apiRequestId) updateData.api_request_id = updates.apiRequestId

      if (updates.status === 'completed' || updates.status === 'failed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await (supabase
        .from('generation_history') as any)
        .update(updateData)
        .eq('id', historyId)
        .eq('workspace_id', workspaceId)
        .select()
        .single()

      if (error) throw error

      return data as GenerationHistoryItem
    } catch (error) {
      throw error
    }
  }

  /**
   * Mark generation as completed
   */
  static async markCompleted(
    historyId: string,
    outputMediaUrl: string,
    outputMediaId: string,
    generationTimeMs: number,
    workspaceId: string,
    revisedPrompt?: string
  ): Promise<GenerationHistoryItem> {
    return this.updateHistoryEntry(
      historyId,
      {
        status: 'completed',
        outputMediaUrl,
        outputMediaId,
        generationTimeMs,
        revisedPrompt,
      },
      workspaceId
    )
  }

  /**
   * Mark generation as failed
   */
  static async markFailed(
    historyId: string,
    errorMessage: string,
    workspaceId: string
  ): Promise<GenerationHistoryItem> {
    return this.updateHistoryEntry(
      historyId,
      {
        status: 'failed',
        errorMessage,
      },
      workspaceId
    )
  }

  /**
   * Get generation history with filters
   */
  static async getHistory(
    workspaceId: string,
    filters: HistoryFilters = {}
  ): Promise<{ items: GenerationHistoryItem[]; total: number }> {
    try {
      const supabase = await getSupabase()
      const { limit = 50, offset = 0, type, action, status, fromDate, toDate } = filters

      // Build count query
      let countQuery = supabase
        .from('generation_history')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      // Build data query
      let dataQuery = supabase
        .from('generation_history')
        .select('*')
        .eq('workspace_id', workspaceId)

      // Apply filters
      if (type) {
        countQuery = countQuery.eq('type', type)
        dataQuery = dataQuery.eq('type', type)
      }
      if (action) {
        countQuery = countQuery.eq('action', action)
        dataQuery = dataQuery.eq('action', action)
      }
      if (status) {
        countQuery = countQuery.eq('status', status)
        dataQuery = dataQuery.eq('status', status)
      }
      if (fromDate) {
        countQuery = countQuery.gte('created_at', fromDate)
        dataQuery = dataQuery.gte('created_at', fromDate)
      }
      if (toDate) {
        countQuery = countQuery.lte('created_at', toDate)
        dataQuery = dataQuery.lte('created_at', toDate)
      }

      const { count } = await countQuery
      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        items: (data || []) as GenerationHistoryItem[],
        total: count || 0,
      }
    } catch (error) {
      return { items: [], total: 0 }
    }
  }

  /**
   * Get recent generations
   */
  static async getRecentHistory(
    workspaceId: string,
    limit: number = 20
  ): Promise<GenerationHistoryItem[]> {
    const { items } = await this.getHistory(workspaceId, { limit })
    return items
  }

  /**
   * Get history by type
   */
  static async getHistoryByType(
    workspaceId: string,
    type: GenerationType,
    limit: number = 50
  ): Promise<GenerationHistoryItem[]> {
    const { items } = await this.getHistory(workspaceId, { type, limit })
    return items
  }

  /**
   * Get generation statistics
   */
  static async getStatistics(workspaceId: string): Promise<{
    totalGenerations: number
    imageGenerations: number
    videoGenerations: number
    successRate: number
    avgGenerationTime: number
  }> {
    try {
      const supabase = await getSupabase()

      // Get total counts
      const { count: totalCount } = await supabase
        .from('generation_history')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)

      const { count: imageCount } = await supabase
        .from('generation_history')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('type', 'image')

      const { count: videoCount } = await supabase
        .from('generation_history')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('type', 'video')

      const { count: completedCount } = await supabase
        .from('generation_history')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'completed')

      // Get average generation time
      const { data: avgData } = await supabase
        .from('generation_history')
        .select('generation_time_ms')
        .eq('workspace_id', workspaceId)
        .eq('status', 'completed')
        .not('generation_time_ms', 'is', null)

      const avgTime = avgData && avgData.length > 0
        ? avgData.reduce((sum: number, item: any) => sum + (item.generation_time_ms || 0), 0) / avgData.length
        : 0

      return {
        totalGenerations: totalCount || 0,
        imageGenerations: imageCount || 0,
        videoGenerations: videoCount || 0,
        successRate: totalCount ? ((completedCount || 0) / totalCount) * 100 : 0,
        avgGenerationTime: Math.round(avgTime),
      }
    } catch (error) {
      return {
        totalGenerations: 0,
        imageGenerations: 0,
        videoGenerations: 0,
        successRate: 0,
        avgGenerationTime: 0,
      }
    }
  }

  /**
   * Delete old history entries (cleanup)
   */
  static async cleanupOldHistory(
    workspaceId: string,
    daysToKeep: number = 30
  ): Promise<number> {
    try {
      const supabase = await getSupabase()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const { data, error } = await supabase
        .from('generation_history')
        .delete()
        .eq('workspace_id', workspaceId)
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) throw error

      return data?.length || 0
    } catch (error) {
      return 0
    }
  }
}

export default GenerationHistoryService
