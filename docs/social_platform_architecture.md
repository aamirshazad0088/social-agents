# Social Platform Integration Architecture

> **Version:** 1.0.0  
> **Last Updated:** December 2025  
> **Status:** Production Ready

This document provides a comprehensive overview of the social media platform integration architecture, including OAuth authentication, token management, content publishing, and data storage.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Supported Platforms](#supported-platforms)
3. [Architecture Components](#architecture-components)
4. [OAuth Authentication Flow](#oauth-authentication-flow)
5. [Token Management](#token-management)
6. [Content Publishing Flow](#content-publishing-flow)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## System Overview

The social platform integration system enables users to:
- Connect multiple social media accounts via OAuth
- Publish content to multiple platforms simultaneously
- Manage tokens with automatic refresh
- Track publishing status and analytics

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[User Interface]
        FE_Services[Platform Services]
    end
    
    subgraph "API Gateway (Next.js Rewrites)"
        Proxy["/api/* → Python Backend"]
    end
    
    subgraph "Python Backend (FastAPI)"
        Auth[Auth Router]
        Social[Social Routers]
        TokenService[Token Refresh Service]
        PlatformServices[Platform Services]
    end
    
    subgraph "External APIs"
        Twitter[Twitter/X API v2]
        Facebook[Facebook Graph API]
        Instagram[Instagram Graph API]
        LinkedIn[LinkedIn REST API]
        TikTok[TikTok API v2]
        YouTube[YouTube Data API v3]
    end
    
    subgraph "Data Layer"
        Supabase[(Supabase DB)]
        Cloudinary[(Cloudinary CDN)]
    end
    
    UI --> FE_Services
    FE_Services --> Proxy
    Proxy --> Auth
    Proxy --> Social
    Auth --> TokenService
    Social --> PlatformServices
    PlatformServices --> Twitter
    PlatformServices --> Facebook
    PlatformServices --> Instagram
    PlatformServices --> LinkedIn
    PlatformServices --> TikTok
    PlatformServices --> YouTube
    Auth --> Supabase
    Social --> Supabase
    Social --> Cloudinary
```

---

## Supported Platforms

| Platform | OAuth Type | Token Lifespan | Refresh Support |
|----------|------------|----------------|-----------------|
| **Twitter/X** | OAuth 2.0 PKCE | 2 hours | ✅ Yes |
| **Facebook** | OAuth 2.0 | 60 days | ✅ Yes (Long-lived) |
| **Instagram** | OAuth 2.0 (via Facebook) | 60 days | ✅ Yes |
| **LinkedIn** | OAuth 2.0 | 60 days | ✅ Yes |
| **TikTok** | OAuth 2.0 | 24 hours | ✅ Yes |
| **YouTube** | OAuth 2.0 | 1 hour | ✅ Yes (Indefinite refresh) |

---

## Architecture Components

### Backend Services

```
python_backend/src/
├── api/v1/
│   ├── auth.py              # OAuth initiation & callbacks
│   ├── credentials.py       # Credential management API
│   ├── token_refresh.py     # On-demand token refresh API
│   └── social/
│       ├── twitter.py       # Twitter posting endpoints
│       ├── facebook.py      # Facebook posting endpoints
│       ├── instagram.py     # Instagram posting endpoints
│       ├── linkedin.py      # LinkedIn posting endpoints
│       ├── tiktok.py        # TikTok posting endpoints
│       └── youtube.py       # YouTube posting endpoints
│
├── services/
│   ├── social_service.py           # Facebook/Instagram Graph API
│   ├── token_refresh_service.py    # Centralized token refresh
│   ├── oauth_service.py            # OAuth state management
│   └── platforms/
│       ├── twitter_service.py      # X API v2 client
│       ├── linkedin_service.py     # LinkedIn REST client
│       ├── tiktok_service.py       # TikTok API client
│       └── youtube_service.py      # YouTube API client
```

### Frontend Services

```
src/services/platforms/
├── BasePlatformService.ts    # Abstract base class
├── twitterService.ts         # Twitter integration
├── facebookService.ts        # Facebook integration
├── instagramService.ts       # Instagram integration
├── linkedinService.ts        # LinkedIn integration
├── tiktokService.ts          # TikTok integration
└── youtubeService.ts         # YouTube integration
```

---

## OAuth Authentication Flow

### 1. OAuth Initiation

User clicks "Connect" → Frontend calls backend → Backend generates OAuth URL → User redirected to platform.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Python Backend
    participant DB as Supabase
    participant P as Platform OAuth

    U->>FE: Click "Connect [Platform]"
    FE->>BE: POST /api/auth/oauth/{platform}/initiate
    BE->>BE: Generate state + PKCE
    BE->>DB: Store oauth_states
    BE-->>FE: Return authorization_url
    FE->>P: Redirect to OAuth page
    U->>P: Grant permissions
    P->>BE: Callback with code + state
    BE->>DB: Verify state
    BE->>P: Exchange code for token
    P-->>BE: Access token + refresh token
    BE->>DB: Store in social_accounts
    BE->>FE: Redirect to success page
```

### 2. PKCE Flow (for Twitter)

```mermaid
flowchart LR
    A[Generate Code Verifier] --> B[SHA256 Hash]
    B --> C[Base64 URL Encode]
    C --> D[Code Challenge]
    D --> E[Include in Auth URL]
    E --> F[Platform Verifies on Callback]
```

### 3. Token Exchange

```mermaid
sequenceDiagram
    participant BE as Backend
    participant P as Platform API
    participant DB as Database

    BE->>P: POST /oauth/token
    Note right of BE: code + code_verifier
    P-->>BE: access_token, refresh_token, expires_in
    BE->>BE: Calculate expires_at
    BE->>DB: UPDATE social_accounts
    Note right of DB: credentials_encrypted, expires_at
```

---

## Token Management

### On-Demand Refresh Strategy

The system uses **on-demand token refresh** - no cron jobs required.

```mermaid
flowchart TD
    A[API Request] --> B{Token expired?}
    B -->|No| C[Use existing token]
    B -->|Yes| D{Has refresh token?}
    D -->|Yes| E[Refresh token automatically]
    D -->|No| F[Return needs_reconnect error]
    E --> G{Refresh successful?}
    G -->|Yes| H[Update DB + Use new token]
    G -->|No| I{Retry count < 3?}
    I -->|Yes| E
    I -->|No| F
    C --> J[Make API call]
    H --> J
```

### Token Refresh Service Flow

```mermaid
sequenceDiagram
    participant API as API Endpoint
    participant TRS as TokenRefreshService
    participant DB as Database
    participant P as Platform API

    API->>TRS: get_valid_credentials(platform, workspace_id)
    TRS->>DB: SELECT from social_accounts
    TRS->>TRS: Check if expired
    
    alt Token Valid
        TRS-->>API: Return credentials
    else Token Expired
        TRS->>P: POST refresh token
        P-->>TRS: New access_token
        TRS->>DB: UPDATE credentials_encrypted
        TRS-->>API: Return new credentials
    else Refresh Failed
        TRS->>DB: Increment error_count
        TRS-->>API: Return needs_reconnect
    end
```

---

## Content Publishing Flow

### 1. Single Platform Post

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant TRS as Token Service
    participant PS as Platform Service
    participant P as Platform API
    participant DB as Database

    FE->>BE: POST /api/{platform}/post
    BE->>TRS: Get valid credentials
    TRS-->>BE: Credentials (auto-refreshed if needed)
    BE->>PS: post_content(credentials, content)
    
    alt Has Media
        PS->>P: Upload media
        P-->>PS: media_id
    end
    
    PS->>P: Create post
    P-->>PS: post_id, url
    PS-->>BE: Success response
    BE->>DB: Store in post_platforms
    BE-->>FE: Return post_id, url
```

### 2. Multi-Platform Publishing

```mermaid
flowchart TD
    A[User Creates Post] --> B[Select Platforms]
    B --> C[Platform Templates Applied]
    C --> D{For Each Platform}
    D --> E[Get Valid Credentials]
    E --> F{Credentials Valid?}
    F -->|Yes| G[Upload Media if needed]
    F -->|No| H[Mark as Failed]
    G --> I[Publish to Platform]
    I --> J{Success?}
    J -->|Yes| K[Store platform_post_id]
    J -->|No| L[Log Error]
    K --> M{More Platforms?}
    L --> M
    H --> M
    M -->|Yes| D
    M -->|No| N[Return Combined Result]
```

### 3. Platform-Specific Content Types

| Platform | Post | Image | Video | Carousel | Reel | Story |
|----------|------|-------|-------|----------|------|-------|
| Twitter | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Facebook | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Instagram | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LinkedIn | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| TikTok | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| YouTube | ❌ | ❌ | ✅ | ❌ | ✅ (Shorts) | ❌ |

---

## Database Schema

### Core Tables

```mermaid
erDiagram
    workspaces ||--o{ social_accounts : has
    workspaces ||--o{ oauth_states : has
    workspaces ||--o{ posts : has
    posts ||--o{ post_platforms : has
    posts ||--o{ post_media : has
    media_assets ||--o{ post_media : used_in

    social_accounts {
        uuid id PK
        uuid workspace_id FK
        enum platform
        text credentials_encrypted
        varchar refresh_token_encrypted
        timestamp expires_at
        timestamp last_refreshed_at
        int refresh_error_count
        bool is_connected
    }

    oauth_states {
        uuid id PK
        uuid workspace_id FK
        enum platform
        varchar state UK
        varchar code_challenge
        timestamp expires_at
        bool is_used
    }

    posts {
        uuid id PK
        uuid workspace_id FK
        text topic
        jsonb content
        array platforms
        timestamp scheduled_at
        enum status
    }

    post_platforms {
        uuid id PK
        uuid post_id FK
        enum platform
        varchar platform_post_id
        varchar platform_status
        timestamp posted_at
    }
```

### Credentials Storage

Credentials are stored in JSONB format within `credentials_encrypted`:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2025-01-28T00:00:00Z",
  "userId": "123456",
  "username": "@user",
  "pageId": "...",
  "pageName": "..."
}
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/oauth/{platform}/initiate` | Start OAuth flow |
| GET | `/api/auth/oauth/{platform}/callback` | OAuth callback |

### Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tokens/get/{platform}` | Get valid credentials (auto-refresh) |
| POST | `/api/tokens/refresh/{platform}` | Force token refresh |
| GET | `/api/tokens/status` | Get all token statuses |

### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credentials` | List connected accounts |
| GET | `/api/credentials/{platform}` | Get platform credentials |
| DELETE | `/api/credentials/{platform}` | Disconnect account |

### Publishing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/twitter/post` | Post to Twitter |
| POST | `/api/facebook/post` | Post to Facebook |
| POST | `/api/instagram/post` | Post to Instagram |
| POST | `/api/linkedin/post` | Post to LinkedIn |
| POST | `/api/tiktok/post` | Post to TikTok |
| POST | `/api/youtube/upload` | Upload to YouTube |

---

## Error Handling

### Error Types

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type?}
    B -->|Token Expired| C[Attempt Refresh]
    B -->|Rate Limited| D[Return retry_after]
    B -->|Invalid Credentials| E[needs_reconnect: true]
    B -->|API Error| F[Log + Return error]
    B -->|Network Error| G[Retry with backoff]
```

### Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| `token_expired` | Token needs refresh | Automatic |
| `refresh_failed` | Couldn't refresh token | Reconnect account |
| `rate_limited` | API rate limit hit | Wait and retry |
| `invalid_credentials` | Token revoked | Reconnect account |
| `platform_error` | Platform API error | Check platform status |

---

## Security Considerations

### Token Security

1. **Encryption at Rest**: Credentials stored encrypted in database
2. **PKCE**: Used for Twitter/X OAuth 2.0 flow
3. **State Validation**: OAuth state verified to prevent CSRF
4. **Short Expiry**: OAuth states expire in 10 minutes

### API Security

1. **JWT Authentication**: All API calls require valid JWT
2. **Workspace Isolation**: Users can only access their workspace data
3. **HTTPS Only**: All production traffic encrypted
4. **Rate Limiting**: API endpoints protected against abuse

### Best Practices

```mermaid
mindmap
  root((Security))
    Token Storage
      Encrypted in DB
      Never in browser localStorage
      Server-side only
    OAuth
      PKCE for all flows
      State verification
      Short-lived states
    API
      JWT required
      CORS configured
      Rate limiting
    Audit
      credential_audit_log table
      Track all token operations
```

---

## Monitoring & Observability

### Health Checks

- `/api/tokens/health` - Token service health
- `/api/auth/` - Auth service status
- `/api/{platform}/info` - Platform API status

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Token refresh success rate | % of successful refreshes | < 95% |
| OAuth completion rate | % of successful connections | < 80% |
| Publishing success rate | % of successful posts | < 90% |
| API latency p99 | 99th percentile latency | > 5s |

---

## Appendix: Platform API Versions

| Platform | API Version | Documentation |
|----------|-------------|---------------|
| Twitter/X | v2 | [X API Docs](https://developer.twitter.com/en/docs/twitter-api) |
| Facebook | v24.0 | [Graph API Docs](https://developers.facebook.com/docs/graph-api) |
| Instagram | v24.0 (Graph API) | [Instagram API Docs](https://developers.facebook.com/docs/instagram-graph-api) |
| LinkedIn | v2 / REST | [LinkedIn API Docs](https://learn.microsoft.com/linkedin/) |
| TikTok | v2 | [TikTok API Docs](https://developers.tiktok.com/) |
| YouTube | v3 | [YouTube API Docs](https://developers.google.com/youtube/v3) |

---

*Document generated: December 2025*
