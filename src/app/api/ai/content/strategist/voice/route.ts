/**
 * Voice Agent Tool Execution API
 * 
 * Executes tool calls requested by Gemini Live API.
 * Uses existing LangChain script agents for content generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTikTokScript } from '@/agents/content_agent/scripts_agent/tiktok_agent';
import { generateInstagramScript } from '@/agents/content_agent/scripts_agent/instagram_agent';
import { generateYouTubeScript } from '@/agents/content_agent/scripts_agent/youtube_agent';
import { generateLinkedInScript } from '@/agents/content_agent/scripts_agent/linkedin_agent';
import { generateTwitterScript } from '@/agents/content_agent/scripts_agent/twitter_agent';

interface ToolCallRequest {
  toolName: string;
  args: Record<string, any>;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ToolCallRequest = await request.json();
    const { toolName, args } = body;

    if (!toolName) {
      return NextResponse.json({ success: false, error: 'toolName required' }, { status: 400 });
    }

    console.log(`[Voice Tools] Executing ${toolName} with args:`, args);

    let result: any;

    // Build query string from args
    const query = args.topic || args.query || JSON.stringify(args);

    switch (toolName) {
      case 'generate_tiktok_script':
        result = await generateTikTokScript(query);
        break;

      case 'generate_instagram_post':
        result = await generateInstagramScript(query);
        break;

      case 'generate_youtube_script':
        result = await generateYouTubeScript(query);
        break;

      case 'generate_linkedin_post':
        result = await generateLinkedInScript(query);
        break;

      case 'generate_twitter_thread':
        result = await generateTwitterScript(query);
        break;

      case 'write_content':
        // Simple passthrough - Gemini writes the content, we just display it
        result = args.content || '';
        break;

      default:
        return NextResponse.json({ success: false, error: `Unknown tool: ${toolName}` }, { status: 400 });
    }

    console.log(`[Voice Tools] ${toolName} result:`, result);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[Voice Tools] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}
