/**
 * Facebook OAuth Callback
 * GET /api/auth/oauth/facebook/callback?code=xxx&state=xxx
 *
 * Handles OAuth callback from Facebook
 * - Supports page selection (user chooses which page to connect)
 * - Gets long-lived tokens
 * - Saves page credentials
 * - NEVER stores API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyOAuthState } from '@/services/database/oauthStateService'
import { CredentialService } from '@/services/database/credentialService'
import { logAuditEvent } from '@/services/database/auditLogService'
import { createHmac } from 'crypto'

/**
 * Generate appsecret_proof for Facebook server-to-server calls
 * Required for secure API calls from the backend
 */
function generateAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret)
    .update(accessToken)
    .digest('hex')
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')


  try {
    // ✅ Step 1: Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=oauth_unauthorized', req.nextUrl.origin)
      )
    }

    // ✅ Step 2: Get workspace and verify admin role using RPC to avoid RLS recursion
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    
    if (rpcError || !rpcData) {
      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
    }

    const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const workspaceId = profileData?.workspace_id
    const userRole = profileData?.role || 'admin'

    if (!workspaceId) {
      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=no_workspace', req.nextUrl.origin)
      )
    }
    

    // Check if user is admin (required for OAuth connections)
    if (userRole !== 'admin') {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_callback_unauthorized',
        status: 'failed',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=insufficient_permissions', req.nextUrl.origin)
      )
    }

    // ✅ Step 3: Check for OAuth denial
    if (error) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_user_denied',
        status: 'failed',
        errorCode: error,
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=user_denied', req.nextUrl.origin)
      )
    }

    // ✅ Step 4: Validate parameters
    if (!code || !state) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_missing_params',
        status: 'failed',
        errorCode: 'MISSING_PARAMS',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=missing_params', req.nextUrl.origin)
      )
    }

    // ✅ Step 5: Verify CSRF state
    
    const stateVerification = await verifyOAuthState(workspaceId, 'facebook', state)
    

    if (!stateVerification.valid) {
      
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_csrf_check_failed',
        status: 'failed',
        errorMessage: stateVerification.error,
        errorCode: 'CSRF_FAILED',
        metadata: {
          statePrefix: state?.substring(0, 20),
          verificationError: stateVerification.error,
        },
        ipAddress: ipAddress || undefined,
      })

      // If this is a concurrent request (race condition), continue with the flow
      // The first request will have already processed the OAuth successfully
      if (stateVerification.error?.includes('concurrent request') || 
          stateVerification.error?.includes('already used')) {
        return NextResponse.redirect(
          new URL('/settings?tab=accounts', req.nextUrl.origin)
        )
      }

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=csrf_check_failed', req.nextUrl.origin)
      )
    }
    

    // ✅ Step 6: Exchange code for token
    const appId = process.env.FACEBOOK_CLIENT_ID
    const appSecret = process.env.FACEBOOK_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
    const callbackUrl = `${baseUrl}/api/auth/oauth/facebook/callback`

    if (!appId || !appSecret) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_config_missing',
        status: 'failed',
        errorCode: 'CONFIG_MISSING',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=config_missing', req.nextUrl.origin)
      )
    }

    let accessToken: string
    try {
      const tokenResponse = await fetch('https://graph.facebook.com/v24.0/oauth/access_token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: callbackUrl,
          code,
        }),
      })


      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.statusText}`)
      }

      const tokenData = await tokenResponse.json()

      if (!tokenData.access_token) {
        throw new Error('No access token in response')
      }

      accessToken = tokenData.access_token
    } catch (exchangeError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_token_exchange_failed',
        status: 'failed',
        errorMessage: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
        errorCode: 'TOKEN_EXCHANGE_FAILED',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=token_exchange_failed', req.nextUrl.origin)
      )
    }

    // ✅ Step 7: Get long-lived token
    let longLivedToken = accessToken
    try {
      const refreshResponse = await fetch(
        `https://graph.facebook.com/v24.0/oauth/access_token?${new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: accessToken,
        })}`
      )


      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        longLivedToken = refreshData.access_token || accessToken
      } else {
        const errorText = await refreshResponse.text()
      }
    } catch (refreshError) {
      // Continue with short-lived token
    }

    // ✅ Step 8: Get user's Facebook pages
    let pages: any[] = []
    try {

      // Generate appsecret_proof for secure server-to-server calls
      const appSecretProof = generateAppSecretProof(longLivedToken, appSecret)

      // Fetch pages with type field to filter out groups
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token,category,type&access_token=${longLivedToken}&appsecret_proof=${appSecretProof}`
      )


      if (!pagesResponse.ok) {
        const errorText = await pagesResponse.text()
        throw new Error(`Facebook API returned ${pagesResponse.status}: ${pagesResponse.statusText} - ${errorText}`)
      }

      const pagesData = await pagesResponse.json()

      // Check for API errors in response body
      if (pagesData.error) {
        const errorMessage = pagesData.error.message || pagesData.error.error_description || 'Unknown error'
        const errorCode = pagesData.error.code || pagesData.error.error_code || ''
        const errorType = pagesData.error.type || pagesData.error.error || ''


        // Log detailed error for debugging
        await logAuditEvent({
          workspaceId,
          userId: user.id,
          platform: 'facebook',
          action: 'oauth_get_pages_error',
          status: 'failed',
          errorMessage: errorMessage,
          errorCode: errorCode,
          metadata: {
            errorType,
            fullError: JSON.stringify(pagesData.error),
            tokenPrefix: longLivedToken.substring(0, 20),
          },
          ipAddress: ipAddress || undefined,
        })

        // Check for specific permission errors
        if (
          errorMessage.includes('Invalid Scopes') ||
          errorMessage.includes('Invalid OAuth') ||
          errorMessage.includes('permission denied')
        ) {
          return NextResponse.redirect(
            new URL('/settings?tab=accounts&oauth_error=facebook_invalid_scopes&details=submit_for_app_review', req.nextUrl.origin)
          )
        }

        // Check for "no pages" error
        if (
          errorMessage.includes('No pages') ||
          errorMessage.includes('not manage') ||
          errorCode === 100
        ) {
          return NextResponse.redirect(
            new URL('/settings?tab=accounts&oauth_error=facebook_no_pages_found', req.nextUrl.origin)
          )
        }

        // Generic error
        throw new Error(`Facebook API error: ${errorMessage}`)
      }

      // Check if data exists and is an array
      if (pagesData.data && Array.isArray(pagesData.data)) {
        // Filter to only include Pages, exclude Groups
        // type field is: "PAGE" for pages, "GROUP" for groups, "APPLICATION" for apps
        pages = pagesData.data.filter((item: any) => item.type === 'PAGE' || !item.type)

        if (pages.length === 0) {
          throw new Error('No Facebook pages found. Groups are not supported for posting.')
        }
      } else if (pagesData.data === undefined) {
        throw new Error('No data in Facebook API response')
      }
    } catch (pagesError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_get_pages_failed',
        status: 'failed',
        errorMessage: pagesError instanceof Error ? pagesError.message : String(pagesError),
        errorCode: 'GET_PAGES_FAILED',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=facebook_get_pages_failed', req.nextUrl.origin)
      )
    }

    // ✅ Step 9: Validate that user has pages
    if (!pages || pages.length === 0) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_no_pages_found',
        status: 'failed',
        errorCode: 'NO_PAGES_FOUND',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=facebook_no_pages_found', req.nextUrl.origin)
      )
    }

    // ✅ Step 10: Store pages list in session for page selection
    // For now, use first page (can be enhanced to let user select)
    const selectedPage = pages[0]

    // ✅ Step 10.5: Fetch Ad Account info for Meta Ads integration
    // ONLY use Business Portfolio owned ad accounts - NO personal accounts
    // Store ALL available businesses so user can switch later
    let adAccountId: string | null = null
    let adAccountName: string | null = null
    let adAccountCurrency: string | null = null
    let adAccountTimezone: string | null = null
    let businessId: string | null = null
    let businessName: string | null = null
    let availableBusinesses: Array<{
      id: string
      name: string
      adAccounts: Array<{ id: string; name: string; currency: string; timezone: string }>
    }> = []

    try {
      const appSecretProof = generateAppSecretProof(longLivedToken, appSecret)
      
      // ONLY fetch ad accounts from Business Portfolios - NO personal accounts
      const businessesResponse = await fetch(
        `https://graph.facebook.com/v24.0/me/businesses?fields=id,name&access_token=${longLivedToken}&appsecret_proof=${appSecretProof}`
      )
      
      if (businessesResponse.ok) {
        const businessesData = await businessesResponse.json()
        let businesses = businessesData.data || []
        
        if (businesses.length > 0) {
          
          // Fetch ad accounts for ALL businesses (so user can switch later)
          for (const business of businesses) {
            const businessAdAccountsResponse = await fetch(
              `https://graph.facebook.com/v24.0/${business.id}/owned_ad_accounts?fields=id,account_id,name,currency,timezone_name&access_token=${longLivedToken}&appsecret_proof=${appSecretProof}`
            )
            
            if (businessAdAccountsResponse.ok) {
              const businessAdAccountsData = await businessAdAccountsResponse.json()
              const adAccounts = (businessAdAccountsData.data || []).map((acc: any) => ({
                id: acc.account_id || acc.id?.replace('act_', ''),
                name: acc.name,
                currency: acc.currency,
                timezone: acc.timezone_name,
              }))
              
              if (adAccounts.length > 0) {
                availableBusinesses.push({
                  id: business.id,
                  name: business.name,
                  adAccounts,
                })
              }
            }
          }
          
          
          // Check if a preferred business name is configured
          const preferredBusinessName = process.env.META_PREFERRED_BUSINESS_NAME
          let selectedBusiness = availableBusinesses[0] // Default to first
          
          if (preferredBusinessName) {
            const preferred = availableBusinesses.find(b => 
              b.name.toLowerCase() === preferredBusinessName.toLowerCase()
            )
            if (preferred) {
              selectedBusiness = preferred
            }
          }
          
          // Set the active business and ad account
          if (selectedBusiness && selectedBusiness.adAccounts.length > 0) {
            const adAccount = selectedBusiness.adAccounts[0]
            adAccountId = adAccount.id
            adAccountName = adAccount.name
            adAccountCurrency = adAccount.currency
            adAccountTimezone = adAccount.timezone
            businessId = selectedBusiness.id
            businessName = selectedBusiness.name
          }
        }
      }
      
      // Log if no business ad account found - personal accounts are NOT used
      if (!adAccountId) {
      }
    } catch (adAccountError) {
      // Non-critical - continue without ad account info
    }

    // ✅ Step 11: Build credentials object
    // IMPORTANT: DO NOT store appSecret here!
    // Now includes Ad Account info for Meta Ads integration
    // Store BOTH the User token (for ads) and Page token (for posting)
    const credentials: any = {
      accessToken: selectedPage.access_token, // Page token for posting
      userAccessToken: longLivedToken, // User token for Meta Ads API calls
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      category: selectedPage.category || null,
      isConnected: true,
      connectedAt: new Date().toISOString(),
      // Ad Account info for Meta Ads (Business Portfolio ONLY)
      adAccountId: adAccountId,
      adAccountName: adAccountName,
      currency: adAccountCurrency,
      timezone: adAccountTimezone,
      // Business Portfolio info
      businessId: businessId,
      businessName: businessName,
      // ALL available businesses (for switching)
      availableBusinesses: availableBusinesses,
    }

    // Facebook tokens typically expire in 60 days
    credentials.expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000
    ).toISOString()

    // ✅ Step 12: Save credentials
    try {
      
      await CredentialService.savePlatformCredentials(
        'facebook',
        credentials,
        user.id,
        workspaceId,
        {
          pageId: selectedPage.id,
          pageName: selectedPage.name,
        }
      )
      
      // Also update social_accounts with ad account info for direct queries
      if (adAccountId) {
        await (supabase
          .from('social_accounts') as any)
          .update({
            account_id: adAccountId,
            account_name: adAccountName,
          })
          .eq('workspace_id', workspaceId)
          .eq('platform', 'facebook')
      }
      
    } catch (saveError) {

      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: 'facebook',
        action: 'oauth_save_credentials_failed',
        status: 'failed',
        errorMessage: saveError instanceof Error ? saveError.message : String(saveError),
        errorCode: 'SAVE_CREDENTIALS_FAILED',
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.redirect(
        new URL('/settings?tab=accounts&oauth_error=facebook_save_failed', req.nextUrl.origin)
      )
    }

    // ✅ Step 13: Success
    const response = NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_success=facebook', req.nextUrl.origin)
    )

    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: 'facebook',
      action: 'platform_connected',
      status: 'success',
      metadata: {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
      },
      ipAddress: ipAddress || undefined,
    })

    return response
  } catch (error) {

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: userRow } = await supabase
          .from('users')
          .select('workspace_id')
          .eq('id', user.id)
          .maybeSingle()

        if (userRow) {
          await logAuditEvent({
            workspaceId: (userRow as any).workspace_id,
            userId: user.id,
            platform: 'facebook',
            action: 'oauth_callback_error',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            errorCode: 'CALLBACK_ERROR',
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
          })
        }
      }
    } catch (auditError) {
    }

    return NextResponse.redirect(
      new URL('/settings?tab=accounts&oauth_error=facebook_callback_error', req.nextUrl.origin)
    )
  }
}
