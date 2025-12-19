/**
 * TikTok OAuth Callback
 * GET /api/auth/oauth/tiktok/callback?code=xxx&state=xxx
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { verifyOAuthState } from "@/services/database/oauthStateService"
import { CredentialService } from "@/services/database/credentialService"
import { logAuditEvent } from "@/services/database/auditLogService"

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")


  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=oauth_unauthorized", req.nextUrl.origin)
      )
    }

    // Get workspace and role using RPC to avoid RLS recursion
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile')
    
    if (rpcError || !rpcData) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=no_workspace", req.nextUrl.origin)
      )
    }

    const profileData: any = Array.isArray(rpcData) ? rpcData[0] : rpcData
    const workspaceId = profileData?.workspace_id
    const userRole = profileData?.role || 'admin'

    if (!workspaceId) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=no_workspace", req.nextUrl.origin)
      )
    }
    

    if (userRole !== "admin") {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "tiktok",
        action: "oauth_callback_unauthorized",
        status: "failed",
        errorCode: "INSUFFICIENT_PERMISSIONS",
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=insufficient_permissions", req.nextUrl.origin)
      )
    }

    if (error) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "tiktok",
        action: "oauth_user_denied",
        status: "failed",
        errorCode: error,
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=user_denied", req.nextUrl.origin)
      )
    }

    if (!code || !state) {
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "tiktok",
        action: "oauth_missing_params",
        status: "failed",
        errorCode: "MISSING_PARAMS",
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=missing_params", req.nextUrl.origin)
      )
    }

    
    const stateVerification = await verifyOAuthState(workspaceId, "tiktok", state)
    
    
    if (!stateVerification.valid) {
      
      await logAuditEvent({
        workspaceId,
        userId: user.id,
        platform: "tiktok",
        action: "oauth_csrf_check_failed",
        status: "failed",
        errorMessage: stateVerification.error,
        errorCode: "CSRF_FAILED",
        metadata: {
          statePrefix: state?.substring(0, 20),
          workspaceId,
        },
        ipAddress: ipAddress || undefined,
      })
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=csrf_check_failed", req.nextUrl.origin)
      )
    }
    

    const codeVerifier = req.cookies.get("oauth_tiktok_verifier")?.value
    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=missing_verifier", req.nextUrl.origin)
      )
    }

    const clientId = process.env.TIKTOK_CLIENT_ID
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    const callbackUrl = `${baseUrl}/api/auth/oauth/tiktok/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=config_missing", req.nextUrl.origin)
      )
    }

    // TikTok API v2 token exchange
    let tokenData: any
    try {
      const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache"
        },
        body: new URLSearchParams({
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier,
        }).toString(),
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json()
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
      }
      tokenData = await tokenResponse.json()
      
      // TikTok v2 API wraps token in data object
      if (tokenData.data) {
        tokenData = { ...tokenData, ...tokenData.data }
      }
      
      if (!tokenData.access_token) {
        throw new Error(`No access token in response`)
      }
    } catch (exchangeError) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=token_exchange_failed", req.nextUrl.origin)
      )
    }

    // TikTok API v2 user info
    let tiktokUser: any
    try {
      const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })
      if (!userResponse.ok) {
        const errorData = await userResponse.json()
        throw new Error(`Failed to fetch user: ${errorData.error?.message || 'Unknown error'}`)
      }
      const userData = await userResponse.json()
      tiktokUser = userData.data?.user || { open_id: tokenData.open_id, display_name: 'TikTok User' }
    } catch (userError) {
      // Use open_id from token response as fallback
      tiktokUser = { open_id: tokenData.open_id, display_name: 'TikTok User' }
    }

    const credentials: any = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      openId: tokenData.open_id || tiktokUser.open_id,
      userId: tokenData.open_id || tiktokUser.open_id,
      username: tiktokUser.display_name || tiktokUser.open_id || 'TikTok User',
      avatarUrl: tiktokUser.avatar_url || null,
      scope: tokenData.scope || '',
      isConnected: true,
      connectedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString(),
      refreshExpiresAt: tokenData.refresh_expires_in 
        ? new Date(Date.now() + tokenData.refresh_expires_in * 1000).toISOString() 
        : null,
    }

    try {
      await CredentialService.savePlatformCredentials("tiktok", credentials, user.id, workspaceId)
    } catch (saveError) {
      return NextResponse.redirect(
        new URL("/settings?tab=accounts&oauth_error=save_failed", req.nextUrl.origin)
      )
    }

    const response = NextResponse.redirect(
      new URL("/settings?tab=accounts&oauth_success=tiktok", req.nextUrl.origin)
    )
    response.cookies.delete("oauth_tiktok_verifier")
    await logAuditEvent({
      workspaceId,
      userId: user.id,
      platform: "tiktok",
      action: "platform_connected",
      status: "success",
      ipAddress: ipAddress || undefined,
    })
    return response
  } catch (error) {
    const response = NextResponse.redirect(
      new URL("/settings?tab=accounts&oauth_error=callback_error", req.nextUrl.origin)
    )
    response.cookies.delete("oauth_tiktok_verifier")
    return response
  }
}
