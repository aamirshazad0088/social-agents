/**
 * Comment Agent Service
 * Main autonomous agent for processing and responding to comments
 */

import { createAgent, toolStrategy } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import * as z from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getCommentAgentMemory, isMemoryAvailable } from './memory.service';
import { 
  createFetchTools, 
  createKnowledgeTools, 
  createReplyTools, 
  createEscalateTools,
  createYouTubeFetchTools,
  createYouTubeReplyTools 
} from '../tools';
import { getCommentAgentSystemPrompt } from '../prompts/comment.prompts';
import { 
  ProcessCommentsRequest, 
  ProcessCommentsResponse,
  CommentAgentCredentials 
} from '../types/comment.types';

// ============================================================================
// STRUCTURED OUTPUT SCHEMA
// ============================================================================

const ProcessingResultSchema = z.object({
  summary: z.string().describe('Brief summary of what was done'),
  autoReplied: z.number().describe('Number of comments auto-replied to'),
  escalated: z.number().describe('Number of comments escalated to user'),
  skipped: z.number().describe('Number of comments skipped (spam, emojis, etc.)'),
  errors: z.number().describe('Number of errors encountered'),
});

type ProcessingResult = z.infer<typeof ProcessingResultSchema>;

// ============================================================================
// MAIN AGENT FUNCTION
// ============================================================================

/**
 * Process comments as a personal assistant
 * - Searches knowledge base first
 * - Auto-replies when confident
 * - Escalates to user when unsure
 */
export async function processComments(
  request: ProcessCommentsRequest,
  credentials: CommentAgentCredentials
): Promise<ProcessCommentsResponse> {
  const startTime = Date.now();
  const { workspaceId, userId, platforms = ['instagram', 'facebook', 'youtube'], runType = 'cron' } = request;


  // Initialize Supabase for logging
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create log entry
  const { data: logEntry } = await supabase
    .from('comment_agent_logs')
    .insert({
      workspace_id: workspaceId,
      run_type: runType,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  try {
    // Check if memory is available
    const hasMemory = await isMemoryAvailable();
    
    let checkpointer, store;
    if (hasMemory) {
      const memory = await getCommentAgentMemory();
      checkpointer = memory.checkpointer;
      store = memory.store;
    }

    // Create platform-specific tools based on requested platforms
    const allTools = [];
    
    // Knowledge and escalation tools are platform-agnostic
    const knowledgeTools = createKnowledgeTools(workspaceId);
    const escalateTools = createEscalateTools(workspaceId);
    allTools.push(...knowledgeTools, ...escalateTools);
    
    // Add platform-specific fetch and reply tools
    const hasMetaPlatforms = platforms.some(p => p === 'instagram' || p === 'facebook');
    const hasYouTube = platforms.includes('youtube');
    
    if (hasMetaPlatforms && credentials.accessToken) {
      // Only create Meta tools if we have a valid Meta access token
      
      const metaFetchTools = createFetchTools({
        accessToken: credentials.accessToken,
        instagramUserId: credentials.instagramUserId,
        facebookPageId: credentials.facebookPageId,
      });
      
      const metaReplyTools = createReplyTools({
        accessToken: credentials.accessToken,
      });
      
      allTools.push(...metaFetchTools, ...metaReplyTools);
    } else if (hasMetaPlatforms) {
    }
    
    if (hasYouTube && credentials.youtubeAccessToken) {
      // Only create YouTube tools if we have a valid YouTube access token
      
      const youtubeFetchTools = createYouTubeFetchTools({
        accessToken: credentials.youtubeAccessToken,
        channelId: credentials.youtubeChannelId,
      });
      
      const youtubeReplyTools = createYouTubeReplyTools({
        accessToken: credentials.youtubeAccessToken,
      });
      
      allTools.push(...youtubeFetchTools, ...youtubeReplyTools);
    } else if (hasYouTube) {
    }

    // Initialize LLM
    const model = new ChatOpenAI({
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.3, // Lower for more consistent responses
    });

    // Create agent configuration
    const agentConfig: any = {
      model,
      tools: allTools,
      systemPrompt: getCommentAgentSystemPrompt(),
      responseFormat: toolStrategy([ProcessingResultSchema]),
    };

    // Add memory if available
    if (checkpointer && store) {
      agentConfig.checkpointer = checkpointer;
      agentConfig.store = store;
    }

    // Create the agent
    const agent = createAgent(agentConfig);

    // Build instruction for the agent
    const platformList = platforms.join(' and ');
    const instruction = request.postIds?.length
      ? `Process comments for these specific posts: ${request.postIds.join(', ')} on ${platformList}. For each comment, search knowledge first, then either reply or escalate.`
      : `Fetch recent posts from ${platformList} and process their unanswered comments. For each comment, search the knowledge base first, then either auto-reply if you find relevant info, or escalate to the user if you need their expertise.`;


    // Run the agent
    const threadId = `comment_agent_${workspaceId}_${Date.now()}`;
    const result = await agent.invoke(
      { messages: [{ role: 'user' as const, content: instruction }] },
      { configurable: { thread_id: threadId } }
    );

    // Extract structured result
    const structured = result.structuredResponse as ProcessingResult | undefined;

    const response: ProcessCommentsResponse = {
      success: true,
      commentsFetched: (structured?.autoReplied || 0) + (structured?.escalated || 0) + (structured?.skipped || 0),
      autoReplied: structured?.autoReplied || 0,
      escalated: structured?.escalated || 0,
      errors: structured?.errors || 0,
      executionTime: Date.now() - startTime,
    };


    // Update log entry
    if (logEntry?.id) {
      await supabase
        .from('comment_agent_logs')
        .update({
          completed_at: new Date().toISOString(),
          comments_fetched: response.commentsFetched,
          auto_replied: response.autoReplied,
          escalated: response.escalated,
          errors: response.errors,
        })
        .eq('id', logEntry.id);
    }

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update log entry with error
    if (logEntry?.id) {
      await supabase
        .from('comment_agent_logs')
        .update({
          completed_at: new Date().toISOString(),
          errors: 1,
          error_message: errorMessage,
        })
        .eq('id', logEntry.id);
    }

    return {
      success: false,
      commentsFetched: 0,
      autoReplied: 0,
      escalated: 0,
      errors: 1,
      executionTime: Date.now() - startTime,
      errorMessage,
    };
  }
}
