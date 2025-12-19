/**
 * Business Settings API Route
 * GET /api/workspace/business-settings - Get business settings
 * PUT /api/workspace/business-settings - Update business settings
 * DELETE /api/workspace/business-settings - Clear business settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { BusinessSettingsService } from '@/services/database/businessSettingsService'

/**
 * Get current user's workspace ID and user ID
 */
async function getAuthContext() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // Get user's workspace
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('id', user.id)
    .single()

  const userRecord = userData as { workspace_id: string } | null
  if (userError || !userRecord?.workspace_id) {
    return { error: 'Workspace not found', status: 404 }
  }

  return { 
    userId: user.id, 
    workspaceId: userRecord.workspace_id 
  }
}

/**
 * GET - Retrieve business settings for current workspace
 */
export async function GET() {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const settings = await BusinessSettingsService.getBusinessSettings(auth.workspaceId)

    return NextResponse.json({
      success: true,
      data: settings, // null if not set
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get business settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update business settings for current workspace
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.businessName || !body.industry) {
      return NextResponse.json(
        { success: false, error: 'Business name and industry are required' },
        { status: 400 }
      )
    }

    const savedSettings = await BusinessSettingsService.saveBusinessSettings(
      auth.workspaceId,
      body,
      auth.userId
    )

    if (!savedSettings) {
      return NextResponse.json(
        { success: false, error: 'Failed to save business settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedSettings,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save business settings' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Clear business settings for current workspace
 */
export async function DELETE() {
  try {
    const auth = await getAuthContext()
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const success = await BusinessSettingsService.clearBusinessSettings(
      auth.workspaceId,
      auth.userId
    )

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to clear business settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to clear business settings' },
      { status: 500 }
    )
  }
}
