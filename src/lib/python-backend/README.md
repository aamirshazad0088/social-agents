# Python Backend API Client

Production-ready TypeScript API client library for connecting the Next.js frontend to the Python FastAPI backend.

## Features

- **Complete API Coverage**: All 14 backend modules with 80+ endpoints
- **Type Safety**: Full TypeScript types matching Python Pydantic schemas
- **Authentication**: Automatic Supabase auth token injection
- **Retry Logic**: Exponential backoff for failed requests
- **SSE Streaming**: Support for Server-Sent Events (real-time chat)
- **Error Handling**: Normalized errors with type guards
- **Feature Flags**: Gradual migration from legacy Next.js API routes

## Installation

The library is included in the project. No additional installation required.

## Quick Start

```typescript
import { api, checkHealth } from '@/lib/python-backend';

// Check backend health
const isHealthy = await checkHealth();
console.log('Backend healthy:', isHealthy);

// Use content strategist
const response = await api.content.chatStrategist({
  message: "Create a LinkedIn post about AI trends",
  threadId: "thread-123",
  modelId: "gemini-2.5-flash"
});

// Post to social media
await api.social.facebook.postPhoto("Check out our new product!", imageUrl);
await api.social.instagram.postReel("Behind the scenes 🎬", videoUrl);
await api.social.linkedin.postText("Excited to announce...");
```

## API Modules

### Content Agent (`api.content`)
- `chatStrategist(request)` - Chat with AI content strategist
- `chatStrategistStream(request, callbacks)` - Streaming chat with SSE
- `getChatHistory(threadId)` - Get conversation history
- `createThreadId()` - Generate new thread ID

### Media Generation (`api.media`)
- `generateMedia(request)` - Generate images/videos/audio
- `improvePrompt(request)` - Improve prompts using AI
- `generateComments(request)` - Generate social media comments

### Media Studio (`api.mediaStudio`)
- `resizeImage(request)` - Resize images for platforms
- `resizeVideo(request)` - Resize videos for platforms
- `mergeVideos(request)` - Merge multiple videos
- `processAudio(request)` - Add/modify audio tracks
- `getMediaLibrary(workspaceId)` - List media items
- `createMediaItem(request)` - Add to library
- `updateMediaItem(request)` - Update library item
- `deleteMediaItem(workspaceId, mediaId)` - Delete from library

### Storage (`api.storage`)
- `uploadFile(file, folder)` - Upload via FormData
- `uploadBase64(data, fileName)` - Upload base64 data
- `createSignedUploadUrl(fileName)` - Get signed URL for direct upload
- `getSignedDownloadUrl(path)` - Get signed download URL
- `deleteFile(path)` - Delete a file
- `listFiles(folder)` - List files in folder

### Workspace (`api.workspace`)
- `getWorkspace(id)` / `updateWorkspace()` / `deleteWorkspace()`
- `getMembers()` / `removeMember()`
- `getInvites()` / `createInvite()` / `deleteInvite()` / `acceptInvite()`
- `getActivity()` - Activity log
- `getBusinessSettings()` / `updateBusinessSettings()`
- `getWorkspaceInfo()` - Complete workspace info

### Posts (`api.posts`)
- `getPosts(userId, workspaceId)` - List all posts
- `getPost(postId, workspaceId)` - Get single post
- `createPost(userId, request)` - Create new post
- `updatePost(userId, postId, request)` - Update post
- `deletePost(userId, postId, workspaceId)` - Delete post
- `schedulePost()` / `updatePostStatus()`

### Credentials (`api.credentials`)
- `getConnectionStatus(userId)` - All platforms status
- `getPlatformCredential(userId, platform)` - Single platform
- `disconnectPlatform(userId, platform)` - Remove connection
- `getConnectedPlatforms(userId)` - List connected

### Social Platforms

#### Facebook (`api.social.facebook`)
- `createPost()` / `createCarousel()` / `uploadMedia()`
- `postText()` / `postPhoto()` / `postVideo()` / `postReel()` / `postStory()`
- `verifyCredentials()` / `getInfo()`

#### Instagram (`api.social.instagram`)
- `createPost()` / `uploadMedia()`
- `postPhoto()` / `postVideo()` / `postCarousel()` / `postReel()` / `postStory()`
- `verifyCredentials()` / `getInfo()`

#### LinkedIn (`api.social.linkedin`)
- `createPost()` / `createCarousel()` / `uploadMedia()`
- `postText()` / `postImage()` / `postVideo()`
- `verifyCredentials()` / `getInfo()`

#### Twitter (`api.social.twitter`)
- `createPost()` / `uploadMedia()`
- `postText()` / `postWithImage()` / `postWithVideo()` / `postWithGif()`
- `postWithMultipleImages()` / `uploadMultipleMedia()`
- `verifyCredentials()` / `getInfo()`

#### TikTok (`api.social.tiktok`)
- `createPost()` / `proxyMedia()`
- `postVideo()` / `postVideoAndWait()`
- `getPublishStatus()` / `verifyCredentials()` / `getInfo()`

#### YouTube (`api.social.youtube`)
- `createPost()`
- `uploadPublicVideo()` / `uploadUnlistedVideo()` / `uploadPrivateVideo()`
- `uploadVideoWithThumbnail()` / `uploadShort()`
- `getCategoryIds()` / `verifyCredentials()` / `getInfo()`

### Canva (`api.canva`)
- `getAuthUrl()` / `isConnected()` / `disconnect()`
- `getDesigns()` / `getDesign()`
- `exportDesign()` / `getExportStatus()` / `exportDesignAndWait()`

### Webhooks (`api.webhooks`)
- `getWebhooksInfo()`
- `verifyMetaAdsWebhook()` / `handleMetaAdsWebhook()`

### Auth (`api.auth`)
- `login()` / `logout()` / `refreshToken()`
- `getCurrentUser()` / `verifyAuth()`

## Configuration

Environment variables (add to `.env.local`):

```bash
# Python backend URL
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:8000

# Feature flags for gradual migration
NEXT_PUBLIC_USE_PYTHON_BACKEND_ALL=true
```

## Error Handling

```typescript
import { api, isBackendError } from '@/lib/python-backend';

try {
  const result = await api.content.chatStrategist(request);
} catch (error) {
  if (isBackendError(error)) {
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.isNetworkError) {
      // Handle offline state
    } else if (error.isServerError) {
      // Handle server errors (5xx)
    } else if (error.isClientError) {
      // Handle client errors (4xx)
    }
  }
}
```

## Streaming (SSE)

```typescript
import { api } from '@/lib/python-backend';

await api.content.chatStrategistStream(
  { message: "Create a post", threadId: "thread-123" },
  (token) => {
    // Called for each token
    appendToDisplay(token);
  },
  (content) => {
    // Called for content chunks
    setGeneratedContent(content);
  },
  (fullResponse) => {
    // Called when stream completes
    console.log("Complete:", fullResponse);
  },
  (error) => {
    // Called on error
    console.error("Stream error:", error);
  }
);
```

## Feature Flags

Check if Python backend should be used:

```typescript
import { shouldUsePythonBackend } from '@/lib/python-backend';

if (shouldUsePythonBackend('useContentBackend')) {
  // Use Python backend
  await api.content.chatStrategist(request);
} else {
  // Use legacy Next.js API
  await fetch('/api-legacy/ai/content/strategist/chat', ...);
}
```

## Directory Structure

```
src/lib/python-backend/
├── index.ts          # Main exports
├── config.ts         # Configuration and endpoints
├── client.ts         # HTTP client with axios
├── types.ts          # TypeScript type definitions
└── api/
    ├── index.ts      # API modules index
    ├── content.ts    # Content agent
    ├── media.ts      # Media generation
    ├── mediaStudio.ts # Media studio operations
    ├── storage.ts    # File storage
    ├── workspace.ts  # Workspace management
    ├── posts.ts      # Post management
    ├── credentials.ts # Platform credentials
    ├── canva.ts      # Canva integration
    ├── webhooks.ts   # Webhooks
    ├── auth.ts       # Authentication
    └── social/
        ├── index.ts
        ├── facebook.ts
        ├── instagram.ts
        ├── linkedin.ts
        ├── twitter.ts
        ├── tiktok.ts
        └── youtube.ts
```

## Backend Endpoints

The Python backend runs on `http://localhost:8000` with the following base paths:

| Module | Base Path |
|--------|-----------|
| Content | `/api/v1/content` |
| Media | `/api/v1/media-generating` |
| Comments | `/api/v1/comments` |
| Media Studio | `/api/v1/media-studio` |
| Storage | `/api/v1/storage` |
| Workspace | `/api/v1/workspace` |
| Posts | `/api/v1/posts` |
| Credentials | `/api/v1/credentials` |
| Webhooks | `/api/v1/webhooks` |
| Canva | `/api/v1/canva` |
| Auth | `/api/v1/auth` |
| Facebook | `/api/v1/social/facebook` |
| Instagram | `/api/v1/social/instagram` |
| LinkedIn | `/api/v1/social/linkedin` |
| Twitter | `/api/v1/social/twitter` |
| TikTok | `/api/v1/social/tiktok` |
| YouTube | `/api/v1/social/youtube` |
