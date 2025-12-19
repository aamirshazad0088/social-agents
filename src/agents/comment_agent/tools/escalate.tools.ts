/**
 * Escalation Tools
 * Tools for escalating comments that need human expertise
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { createClient } from '@supabase/supabase-js';

/**
 * Create tools for escalating comments to user
 */
export function createEscalateTools(workspaceId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Escalate a comment to the user when AI cannot answer confidently
   */
  const escalateToUser = tool(
    async ({ 
      commentId, 
      postId, 
      platform, 
      username, 
      originalComment, 
      summary,
      commentTimestamp,
      postCaption 
    }) => {
      try {

        // Check for duplicates first
        const { data: existing } = await supabase
          .from('pending_comments')
          .select('id')
          .eq('comment_id', commentId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (existing) {
          return JSON.stringify({
            success: false,
            reason: 'Already escalated - duplicate prevented',
          });
        }

        // Store for user review
        const { error } = await supabase
          .from('pending_comments')
          .insert({
            comment_id: commentId,
            post_id: postId,
            platform,
            workspace_id: workspaceId,
            username,
            original_comment: originalComment,
            summary,
            comment_timestamp: commentTimestamp || null,
            post_caption: postCaption || null,
            status: 'pending',
          });

        if (error) {
          return JSON.stringify({ 
            success: false, 
            error: error.message 
          });
        }


        return JSON.stringify({
          success: true,
          message: `Escalated to user: "${summary}"`,
        });
      } catch (error) {
        return JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    },
    {
      name: 'escalate_to_user',
      description: `Escalate a comment to the user when you CANNOT answer it confidently. Use this when:
- The comment asks about specific order/account details
- The comment requires human judgment or expertise
- No relevant knowledge was found in the knowledge base
- The comment is about pricing not in your knowledge
- The comment is a partnership/business inquiry
- The comment contains a complaint requiring personal attention
- You are unsure about the correct answer

ALWAYS provide a clear 1-line summary explaining why the user needs to handle this.`,
      schema: z.object({
        commentId: z.string().describe('The comment ID from the platform'),
        postId: z.string().describe('The post ID this comment is on'),
        platform: z.enum(['instagram', 'facebook', 'youtube']).describe('The platform'),
        username: z.string().describe('Username of the person who commented'),
        originalComment: z.string().describe('The FULL original comment text - do not truncate'),
        summary: z.string().describe('ONE LINE summary explaining why user needs to handle this. Examples: "Asking about custom bulk order pricing", "Complaint about late delivery", "Partnership inquiry from brand"'),
        commentTimestamp: z.string().optional().describe('When the comment was posted'),
        postCaption: z.string().optional().describe('Caption of the post for context'),
      }),
    }
  );

  /**
   * Check if a comment was already escalated
   */
  const checkIfEscalated = tool(
    async ({ commentId }) => {
      try {
        const { data, error } = await supabase
          .from('pending_comments')
          .select('id, status, user_reply')
          .eq('comment_id', commentId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (error) {
          return JSON.stringify({ escalated: false, error: error.message });
        }

        if (data) {
          return JSON.stringify({
            escalated: true,
            status: data.status,
            hasUserReply: !!data.user_reply,
          });
        }

        return JSON.stringify({ escalated: false });
      } catch (error) {
        return JSON.stringify({ 
          escalated: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    },
    {
      name: 'check_if_escalated',
      description: 'Check if a comment has already been escalated to the user. Use this to avoid duplicate escalations.',
      schema: z.object({
        commentId: z.string().describe('The comment ID to check'),
      }),
    }
  );

  return [escalateToUser, checkIfEscalated];
}
