/**
 * Knowledge Search Tools
 * Tools for searching company knowledge base before answering comments
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { createClient } from '@supabase/supabase-js';

/**
 * Create tools for searching company knowledge base
 */
export function createKnowledgeTools(workspaceId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Search the company knowledge base for relevant information
   */
  const searchKnowledge = tool(
    async ({ query, category }) => {
      try {

        // Build search query
        let dbQuery = supabase
          .from('company_knowledge')
          .select('id, category, title, question, answer')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true);

        // Add category filter if specified
        if (category) {
          dbQuery = dbQuery.eq('category', category);
        }

        const { data, error } = await dbQuery;

        if (error) {
          return JSON.stringify({
            found: false,
            message: 'Error searching knowledge base',
          });
        }

        if (!data || data.length === 0) {
          return JSON.stringify({
            found: false,
            message: 'No knowledge entries in database. This comment needs human expertise.',
          });
        }

        // Simple text matching (could be enhanced with embeddings)
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        const matches = data
          .map(entry => {
            const titleLower = (entry.title || '').toLowerCase();
            const questionLower = (entry.question || '').toLowerCase();
            const answerLower = (entry.answer || '').toLowerCase();
            const allText = `${titleLower} ${questionLower} ${answerLower}`;

            // Calculate match score
            let score = 0;
            for (const word of queryWords) {
              if (allText.includes(word)) score += 1;
              if (titleLower.includes(word)) score += 2; // Title matches worth more
              if (questionLower.includes(word)) score += 2; // Question matches worth more
            }

            return { ...entry, score };
          })
          .filter(entry => entry.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3); // Top 3 matches

        if (matches.length === 0) {
          return JSON.stringify({
            found: false,
            message: 'No matching knowledge found for this topic. This comment needs human expertise.',
          });
        }


        return JSON.stringify({
          found: true,
          matches: matches.map(m => ({
            category: m.category,
            title: m.title,
            question: m.question,
            answer: m.answer,
          })),
        });
      } catch (error) {
        return JSON.stringify({
          found: false,
          message: 'Error searching knowledge base. This comment needs human expertise.',
        });
      }
    },
    {
      name: 'search_company_knowledge',
      description: 'Search company knowledge base for FAQs, policies, product info, pricing, shipping, etc. ALWAYS use this FIRST before deciding if you can answer a comment. If knowledge is found, use it to craft a reply. If not found, escalate to user.',
      schema: z.object({
        query: z.string().describe('Search query based on the comment topic/question'),
        category: z.enum([
          'faq', 'policy', 'product', 'pricing', 'shipping', 
          'returns', 'support', 'hours', 'contact', 'general'
        ]).optional().describe('Optional category to narrow search'),
      }),
    }
  );

  return [searchKnowledge];
}
