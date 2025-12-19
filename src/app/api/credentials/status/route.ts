/**
 * Credentials Status Endpoint
 * GET /api/credentials/status
 *
 * Returns connection status for all platforms
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database/credentialService'
import { WorkspaceService } from '@/services/database/workspaceService'
import { getCacheHeaders } from '@/lib/cache/cacheHeaders'

export async function GET(req: NextRequest) {
  try {
    // ✅ Authenticate user
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ Ensure user has a workspace (auto-create if missing)
    let workspaceId: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize workspace'
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // ✅ Clean up any invalid credentials first (orphaned records)
    await CredentialService.cleanupInvalidCredentials(workspaceId)

    // ✅ Get connection status
    const status = await CredentialService.getConnectionStatus(workspaceId)

    // Cache connection status for 1 minute (private, user-specific)
    return NextResponse.json(status, {
      headers: getCacheHeaders('private-short'),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
}
