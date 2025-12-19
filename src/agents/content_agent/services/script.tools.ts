/**
 * Script Agent Tools - Simplified Multi-agent Tool Calling Pattern
 * 
 * Each platform-specific script generator is wrapped as a LangChain tool.
 * Subagents receive a simple query string and return plain AI text response.
 */

import { tool } from 'langchain';
import * as z from 'zod';
import { generateTikTokScript } from '../scripts_agent/tiktok_agent';
import { generateInstagramScript } from '../scripts_agent/instagram_agent';
import { generateFacebookScript } from '../scripts_agent/facebook_agent';
import { generateYouTubeScript } from '../scripts_agent/youtube_agent';
import { generateLinkedInScript } from '../scripts_agent/linkedin_agent';
import { generateTwitterScript } from '../scripts_agent/twitter_agent';

// TikTok Script Tool
export const tiktokScriptTool = tool(
  async ({ query }) => {
    const result = await generateTikTokScript(query);
    return result;
  },
  {
    name: 'generate_tiktok_script',
    description: 'Generate a TikTok video script. Only call when user explicitly asks for TikTok content.',
    schema: z.object({
      query: z.string().describe('The query describing the TikTok script to generate'),
    }),
  }
);

// Instagram Script Tool
export const instagramScriptTool = tool(
  async ({ query }) => {
    const result = await generateInstagramScript(query);
    return result;
  },
  {
    name: 'generate_instagram_script',
    description: 'Generate Instagram content. Only call when user explicitly asks for Instagram content.',
    schema: z.object({
      query: z.string().describe('The query describing the Instagram content to generate'),
    }),
  }
);

// Facebook Script Tool
export const facebookScriptTool = tool(
  async ({ query }) => {
    const result = await generateFacebookScript(query);
    return result;
  },
  {
    name: 'generate_facebook_script',
    description: 'Generate Facebook content. Only call when user explicitly asks for Facebook content.',
    schema: z.object({
      query: z.string().describe('The query describing the Facebook content to generate'),
    }),
  }
);

// YouTube Script Tool
export const youtubeScriptTool = tool(
  async ({ query }) => {
    const result = await generateYouTubeScript(query);
    return result;
  },
  {
    name: 'generate_youtube_script',
    description: 'Generate YouTube video script. Only call when user explicitly asks for YouTube content.',
    schema: z.object({
      query: z.string().describe('The query describing the YouTube script to generate'),
    }),
  }
);

// LinkedIn Script Tool
export const linkedinScriptTool = tool(
  async ({ query }) => {
    const result = await generateLinkedInScript(query);
    return result;
  },
  {
    name: 'generate_linkedin_script',
    description: 'Generate LinkedIn post. Only call when user explicitly asks for LinkedIn content.',
    schema: z.object({
      query: z.string().describe('The query describing the LinkedIn content to generate'),
    }),
  }
);

// Twitter Script Tool
export const twitterScriptTool = tool(
  async ({ query }) => {
    const result = await generateTwitterScript(query);
    return result;
  },
  {
    name: 'generate_twitter_script',
    description: 'Generate Twitter/X thread. Only call when user explicitly asks for Twitter content.',
    schema: z.object({
      query: z.string().describe('The query describing the Twitter content to generate'),
    }),
  }
);

// All Script Tools for Supervisor Agent
export const scriptTools = [
  tiktokScriptTool,
  instagramScriptTool,
  facebookScriptTool,
  youtubeScriptTool,
  linkedinScriptTool,
  twitterScriptTool,
];
