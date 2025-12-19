/**
 * API Route: Veo Operation Status
 * POST /api/ai/media/veo/status
 * Check the status of a video generation operation
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkVeoOperationStatus } from '@/agents/video_agent';
import { AgentError } from '@/agents/shared/types/common.types';
import * as z from 'zod';

const veoStatusSchema = z.object({
  operationId: z.string().min(1, 'Operation ID is required'),
  operationName: z.string().optional(),
});

/**
 * POST /api/ai/media/veo/status
 * Check the status of a video generation operation
 * 
 * Request body:
 * {
 *   operationId: string (required)
 *   operationName?: string (optional, full operation path)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   operationId: string
 *   done: boolean
 *   status: 'pending' | 'processing' | 'completed' | 'failed'
 *   progress?: number
 *   video?: {
 *     url: string
 *     veoVideoId: string
 *     duration: number
 *     resolution: string
 *   }
 *   error?: string
 * }
 * 
 * Notes:
 * - Poll this endpoint every 10 seconds until done=true
 * - Video generation takes 11 seconds to 6 minutes
 * - When done=true and status='completed', video object contains the result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = veoStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { operationId, operationName } = validation.data;


    // Call the Veo status service
    const result = await checkVeoOperationStatus({
      operationId,
      operationName,
    });

    return NextResponse.json(result);
  } catch (error) {

    if (error instanceof AgentError) {
      const statusCode = error.type === 'API_KEY_INVALID' ? 401 :
                        error.type === 'RATE_LIMIT' ? 429 :
                        error.type === 'VALIDATION_ERROR' ? 400 : 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check operation status',
      },
      { status: 500 }
    );
  }
}

