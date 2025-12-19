/**
 * Content Agent API
 * 
 * API client for the Python backend content strategist agent.
 * Provides chat, streaming, and history retrieval functionality.
 */

import { get, post, streamPost } from '../client';
import { ENDPOINTS } from '../config';
import type {
    ChatStrategistRequest,
    ChatStrategistResponse,
    ChatHistoryResponse,
    StreamEvent,
} from '../types';

/**
 * Chat with the content strategist agent
 * 
 * Sends a message to the AI content strategist and receives a response.
 * Supports multimodal input (text, images, documents).
 * 
 * @param request - Chat request with message and optional attachments
 * @returns Promise resolving to chat response
 * 
 * @example
 * ```typescript
 * const response = await chatStrategist({
 *   message: "Create a LinkedIn post about AI trends",
 *   threadId: "thread-123",
 *   modelId: "gemini-2.5-flash"
 * });
 * ```
 */
export async function chatStrategist(
    request: ChatStrategistRequest
): Promise<ChatStrategistResponse> {
    return post<ChatStrategistResponse>(
        ENDPOINTS.content.chat,
        request
    );
}

/**
 * Chat with content strategist using streaming response
 * 
 * Opens a Server-Sent Events connection for real-time token streaming.
 * Useful for displaying response as it's generated.
 * 
 * @param request - Chat request
 * @param onToken - Callback invoked for each token received
 * @param onContent - Callback for generated content chunks
 * @param onComplete - Callback when stream completes with full response
 * @param onError - Callback for error handling
 * 
 * @example
 * ```typescript
 * await chatStrategistStream(
 *   { message: "Create a post", threadId: "thread-123" },
 *   (token) => appendToDisplay(token),
 *   (content) => setGeneratedContent(content),
 *   (fullResponse) => console.log("Complete:", fullResponse),
 *   (error) => console.error("Error:", error)
 * );
 * ```
 */
export async function chatStrategistStream(
    request: ChatStrategistRequest,
    onToken: (token: string) => void,
    onContent?: (content: string) => void,
    onComplete?: (fullResponse: string) => void,
    onError?: (error: Error) => void
): Promise<void> {
    return streamPost<StreamEvent>(
        ENDPOINTS.content.chatStream,
        request,
        (event) => {
            switch (event.type) {
                case 'token':
                    if (event.content) {
                        onToken(event.content);
                    }
                    break;
                case 'content':
                    if (event.content && onContent) {
                        onContent(event.content);
                    }
                    break;
                case 'done':
                    if (event.fullResponse && onComplete) {
                        onComplete(event.fullResponse);
                    }
                    break;
                case 'error':
                    if (onError) {
                        onError(new Error(event.message || 'Stream error'));
                    }
                    break;
            }
        },
        onError,
        () => {
            // Stream completed without explicit done event
        }
    );
}

/**
 * Get chat history for a thread
 * 
 * Retrieves conversation checkpoints for memory persistence.
 * 
 * @param threadId - Thread ID to retrieve history for
 * @returns Promise resolving to chat history with checkpoints
 * 
 * @example
 * ```typescript
 * const history = await getChatHistory("thread-123");
 * console.log("Checkpoints:", history.checkpoints);
 * ```
 */
export async function getChatHistory(
    threadId: string
): Promise<ChatHistoryResponse> {
    return get<ChatHistoryResponse>(
        ENDPOINTS.content.history(threadId)
    );
}

/**
 * Create a new chat thread ID
 * 
 * Utility function to generate a unique thread ID for new conversations.
 * 
 * @returns Unique thread ID string
 */
export function createThreadId(): string {
    return `thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
