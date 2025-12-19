/**
 * LinkedIn - Toggle Post Target
 * POST /api/linkedin/toggle-post-target
 *
 * Body: {
 *   postToPage: boolean
 * }
 *
 * Toggles between posting to personal profile or company page
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { CredentialService } from '@/services/database'
import { LinkedInCredentials } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace_id
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('id', user.id)
      .maybeSingle<{ workspace_id: string }>()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get request body
    const body = await req.json()
    const { postToPage } = body

    if (typeof postToPage !== 'boolean') {
      return NextResponse.json(
        { error: 'postToPage must be a boolean' },
        { status: 400 }
      )
    }

    // Get current LinkedIn credentials
    const credentials = await CredentialService.getPlatformCredentials(
      'linkedin',
      user.id,
      userData.workspace_id
    )

    if (!credentials || !('accessToken' in credentials)) {
      return NextResponse.json(
        { error: 'LinkedIn not connected' },
        { status: 400 }
      )
    }

    const linkedInCreds = credentials as LinkedInCredentials

    // Check if organization exists when trying to post to page
    if (postToPage && !linkedInCreds.organizationId) {
      return NextResponse.json(
        { error: 'No company page found. Please reconnect LinkedIn to fetch organization pages.' },
        { status: 400 }
      )
    }

    // Update credentials with new postToPage setting
    const updatedCredentials: LinkedInCredentials = {
      ...linkedInCreds,
      postToPage,
    }

    // Save updated credentials
    await CredentialService.savePlatformCredentials(
      'linkedin',
      updatedCredentials,
      user.id,
      userData.workspace_id
    )


    return NextResponse.json({
      success: true,
      postToPage,
      target: postToPage 
        ? `Company Page: ${linkedInCreds.organizationName || linkedInCreds.organizationId}`
        : `Personal Profile: ${linkedInCreds.profileName || linkedInCreds.profileId}`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update post target',
        details: (error as any).message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
