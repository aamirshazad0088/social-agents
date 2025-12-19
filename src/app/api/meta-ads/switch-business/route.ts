/**
 * Switch Active Business Portfolio for Meta Ads
 * POST /api/meta-ads/switch-business
 * 
 * Allows users to switch between their available Business Portfolios
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { WorkspaceService } from '@/services/database/workspaceService'
import {
  encryptCredentials,
  decryptCredentials,
  getOrCreateWorkspaceEncryptionKey,
} from '@/lib/auth/encryptionManager'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { businessId, adAccountId } = body

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get workspace
    let workspaceId: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get workspace' },
        { status: 500 }
      )
    }

    // Get current Facebook credentials
    const { data: socialAccount, error: fetchError } = await (supabase
      .from('social_accounts') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .maybeSingle()

    if (fetchError || !socialAccount?.credentials_encrypted) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }

    // Decrypt credentials
    const encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
    const decrypted = await decryptCredentials(socialAccount.credentials_encrypted, encryptionKey)

    // Check if the requested business exists in available businesses
    const availableBusinesses = decrypted.availableBusinesses || []
    const selectedBusiness = availableBusinesses.find((b: any) => b.id === businessId)

    if (!selectedBusiness) {
      return NextResponse.json(
        { error: 'Business Portfolio not found in available businesses' },
        { status: 400 }
      )
    }

    // Find the ad account (use specified or first available)
    let selectedAdAccount = selectedBusiness.adAccounts[0]
    if (adAccountId) {
      const found = selectedBusiness.adAccounts.find((a: any) => a.id === adAccountId)
      if (found) {
        selectedAdAccount = found
      }
    }

    if (!selectedAdAccount) {
      return NextResponse.json(
        { error: 'No ad accounts found in this Business Portfolio' },
        { status: 400 }
      )
    }

    // Update credentials with new active business
    const updated = {
      ...decrypted,
      businessId: selectedBusiness.id,
      businessName: selectedBusiness.name,
      adAccountId: selectedAdAccount.id,
      adAccountName: selectedAdAccount.name,
      currency: selectedAdAccount.currency,
      timezone: selectedAdAccount.timezone,
    }

    const encrypted = await encryptCredentials(updated, encryptionKey)

    // Save updated credentials
    const { error: updateError } = await (supabase
      .from('social_accounts') as any)
      .update({
        credentials_encrypted: encrypted,
        account_id: selectedAdAccount.id,
        account_name: selectedAdAccount.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', socialAccount.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update business selection' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      business: {
        id: selectedBusiness.id,
        name: selectedBusiness.name,
      },
      adAccount: {
        id: selectedAdAccount.id,
        name: selectedAdAccount.name,
        currency: selectedAdAccount.currency,
        timezone: selectedAdAccount.timezone,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to switch business' },
      { status: 500 }
    )
  }
}

// GET - Get available businesses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get workspace
    let workspaceId: string
    try {
      workspaceId = await WorkspaceService.ensureUserWorkspace(user.id, user.email || undefined)
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to get workspace' },
        { status: 500 }
      )
    }

    // Get current Facebook credentials
    const { data: socialAccount, error: fetchError } = await (supabase
      .from('social_accounts') as any)
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'facebook')
      .maybeSingle()

    if (fetchError || !socialAccount?.credentials_encrypted) {
      return NextResponse.json(
        { error: 'Facebook not connected', availableBusinesses: [], activeBusiness: null },
        { status: 200 }
      )
    }

    // Decrypt credentials
    const encryptionKey = await getOrCreateWorkspaceEncryptionKey(workspaceId)
    const decrypted = await decryptCredentials(socialAccount.credentials_encrypted, encryptionKey)

    const availableBusinesses = decrypted.availableBusinesses || []
    const activeBusiness = {
      id: decrypted.businessId,
      name: decrypted.businessName,
      adAccount: {
        id: decrypted.adAccountId,
        name: decrypted.adAccountName,
        currency: decrypted.currency,
        timezone: decrypted.timezone,
      },
    }

    return NextResponse.json({
      availableBusinesses,
      activeBusiness,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get businesses' },
      { status: 500 }
    )
  }
}
