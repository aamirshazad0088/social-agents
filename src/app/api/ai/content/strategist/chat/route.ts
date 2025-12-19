import { NextRequest, NextResponse } from 'next/server';
import { contentStrategistChat, chatStrategistRequestSchema } from '@/agents/content_agent';
import { AgentError } from '@/agents/shared/types/common.types';

/**
 * POST /api/ai/content/strategist/chat
 * Handle conversational AI chat for content strategy with multimodal support
 * 
 * Request body:
 * {
 *   message: string,
 *   threadId?: string,
 *   attachments?: Array<{
 *     type: 'image' | 'pdf' | 'document' | 'text' | 'csv' | 'json',
 *     name: string,
 *     data: string (base64),
 *     mimeType?: string,
 *     size?: number
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request with Zod schema (includes attachment validation)
    const validation = chatStrategistRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    // Call strategist chat agent with attachments
    const result = await contentStrategistChat(validation.data as any);

    return NextResponse.json(result);
  } catch (error) {
    
    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 : 
                        error.type === 'RATE_LIMIT' ? 429 : 500;
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process chat' 
      },
      { status: 500 }
    );
  }
}
