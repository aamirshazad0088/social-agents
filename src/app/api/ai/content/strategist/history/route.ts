import { NextRequest, NextResponse } from 'next/server';
import { getContentAgentMemory } from '@/agents/content_agent/services/memory.service';

/**
 * Format structured content generation response into readable text
 */
function formatGeneratedContent(data: any): string {
  if (!data.contents || !Array.isArray(data.contents)) {
    return JSON.stringify(data);
  }

  const parts: string[] = [];
  
  for (const item of data.contents) {
    const platform = item.platform || 'Content';
    const type = item.contentType || item.type || '';
    const title = item.title || '';
    
    // Format platform header
    const platformDisplay = platform.charAt(0).toUpperCase() + platform.slice(1);
    parts.push(`**${platformDisplay} ${type}${title ? ` - ${title}` : ''}**`);
    
    if (item.description) {
      parts.push(item.description);
    }
    
    if (item.prompt) {
      parts.push(`\n**Image Prompt:** ${item.prompt}`);
    }
    
    if (item.hashtags) {
      parts.push(`\n${item.hashtags}`);
    }
    
    parts.push('');
  }
  
  return parts.join('\n').trim() || 'Content generated successfully.';
}

/**
 * GET /api/ai/content/strategist/history
 * Fetches conversation history from LangGraph checkpoints
 * 
 * Query params:
 * - threadId: LangGraph thread ID to fetch history for
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');
  
  if (!threadId) {
    return NextResponse.json(
      { error: 'threadId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const { checkpointer } = await getContentAgentMemory();
    
    // Fetch the latest checkpoint for this thread
    const checkpoint = await checkpointer.get({
      configurable: { thread_id: threadId }
    });
    
    if (!checkpoint) {
      return NextResponse.json(
        { error: 'Thread not found', threadId },
        { status: 404 }
      );
    }

    // Extract messages from checkpoint state
    const messagesArray = Array.isArray(checkpoint.channel_values?.messages) 
      ? checkpoint.channel_values.messages 
      : [];
    
    // Transform LangChain messages to UI format, filtering out tool calls and system messages
    const uiMessages = messagesArray
      .filter((msg: any) => {
        // Skip tool messages and function calls
        const msgType = msg._getType?.() || msg.type;
        if (msgType === 'tool' || msgType === 'function' || msgType === 'system') {
          return false;
        }
        // Skip messages that are tool call results
        if (msg.tool_call_id || msg.name) {
          return false;
        }
        return true;
      })
      .map((msg: any) => {
      // Determine role based on message type
      let role: 'user' | 'assistant' = 'user';
      
      if (msg._getType) {
        const msgType = msg._getType();
        if (msgType === 'ai' || msgType === 'assistant') {
          role = 'assistant';
        }
      } else if (msg.type) {
        // Fallback to type property
        if (msg.type === 'ai' || msg.type === 'assistant') {
          role = 'assistant';
        }
      }

      // Extract content properly from various formats
      let content = '';
      let attachments: Array<{ type: 'image' | 'file'; name: string; url: string }> = [];
      
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Multi-modal message (e.g., text + images)
        // Extract text parts and image parts separately
        const textParts: string[] = [];
        
        msg.content.forEach((part: any) => {
          if (part.type === 'text' && part.text) {
            textParts.push(part.text);
          } else if (part.type === 'image_url' && part.image_url?.url) {
            // Store image as attachment
            attachments.push({
              type: 'image',
              name: 'Uploaded Image',
              url: part.image_url.url
            });
          }
        });
        
        content = textParts.join('\n');
      } else if (typeof msg.content === 'object' && msg.content !== null) {
        // Object content - try to extract meaningful text
        if (msg.content.text) {
          content = msg.content.text;
        } else if (msg.content.message) {
          content = msg.content.message;
        } else if (msg.content.contents && Array.isArray(msg.content.contents)) {
          // Structured content generation response - format nicely
          content = formatGeneratedContent(msg.content);
        } else {
          // Fallback to JSON for complex objects
          content = JSON.stringify(msg.content);
        }
      }
      
      // Also check if string content is actually JSON that should be parsed
      if (typeof content === 'string') {
        // Handle "Returning structured response:" prefix
        const structuredPrefix = 'Returning structured response:';
        if (content.includes(structuredPrefix)) {
          const jsonStart = content.indexOf(structuredPrefix) + structuredPrefix.length;
          const jsonStr = content.substring(jsonStart).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.contents && Array.isArray(parsed.contents)) {
              content = formatGeneratedContent(parsed);
            }
          } catch {
            // Not valid JSON, keep as-is
          }
        }
        // Handle raw JSON strings starting with {
        else if (content.startsWith('{') && content.includes('"contents"')) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.contents && Array.isArray(parsed.contents)) {
              content = formatGeneratedContent(parsed);
            }
          } catch {
            // Not valid JSON, keep as-is
          }
        }
      }

      const result: any = {
        role,
        content,
        timestamp: msg.additional_kwargs?.timestamp || new Date().toISOString()
      };
      
      // Include attachments if present
      if (attachments.length > 0) {
        result.attachments = attachments;
      }

      return result;
    });

    // Deduplicate consecutive AI messages with similar content
    const deduplicatedMessages = uiMessages.reduce((acc: any[], msg: any, index: number) => {
      // Skip empty messages
      if (!msg.content || msg.content.trim() === '') {
        return acc;
      }
      
      // For AI messages, check if the next message is similar (duplicate)
      if (msg.role === 'assistant' && index < uiMessages.length - 1) {
        const nextMsg = uiMessages[index + 1];
        if (nextMsg.role === 'assistant') {
          // Normalize content for comparison (remove markdown, whitespace)
          const normalizedCurrent = msg.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
          const normalizedNext = nextMsg.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
          
          // Check if they're essentially the same content
          if (normalizedCurrent === normalizedNext || 
              normalizedNext.includes(normalizedCurrent) || 
              normalizedCurrent.includes(normalizedNext)) {
            // Skip this one, keep the next (which is usually better formatted)
            return acc;
          }
        }
      }
      
      // Check if this message is a duplicate of the previous one added
      if (acc.length > 0 && msg.role === 'assistant') {
        const lastMsg = acc[acc.length - 1];
        if (lastMsg.role === 'assistant') {
          const normalizedLast = lastMsg.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
          const normalizedCurrent = msg.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
          
          if (normalizedLast === normalizedCurrent || 
              normalizedLast.includes(normalizedCurrent) || 
              normalizedCurrent.includes(normalizedLast)) {
            // Replace with the better formatted one (usually the longer one or current)
            if (msg.content.length > lastMsg.content.length) {
              acc[acc.length - 1] = msg;
            }
            return acc;
          }
        }
      }
      
      acc.push(msg);
      return acc;
    }, []);

    return NextResponse.json({
      success: true,
      messages: deduplicatedMessages,
      threadId,
      messageCount: deduplicatedMessages.length
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/content/strategist/history
 * Note: LangGraph PostgresSaver doesn't have a delete method.
 * Deletion is handled by soft-deleting the content_threads record in Supabase.
 * The checkpoint data remains in the database but becomes inaccessible.
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Thread deletion should be handled through the ThreadService (soft delete in Supabase)',
      message: 'Use DELETE /api/threads/:id instead'
    },
    { status: 501 }
  );
}
