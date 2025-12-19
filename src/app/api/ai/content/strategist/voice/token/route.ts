/**
 * Ephemeral Token API for Gemini Live
 * 
 * Generates short-lived tokens for secure client-side Gemini Live API access.
 * Returns both the token and configuration for client-side connection.
 */

import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Return the API key directly for client-side use
    // Note: In production, use proper ephemeral token generation
    // For now, we'll use direct API key with WebSocket
    return NextResponse.json({
      success: true,
      apiKey: apiKey,
      model: GEMINI_MODEL,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Sulafat' }
          }
        },
        systemInstruction: {
          parts: [{
            text: `You are a helpful content creation assistant for social media. You help users:
- Generate content ideas for platforms like TikTok, Instagram, YouTube, LinkedIn, Twitter
- Create scripts, captions, and posts
- Plan content calendars
- Analyze trends and suggest improvements

When users ask you to create content, use the available tools to generate it.
Be conversational, creative, and concise in your voice responses.
Speak naturally as if having a friendly conversation.

You have multimodal capabilities: you can hear the user's voice and see their screen or camera feed if they enable it. When a user shares their screen or camera, analyze what is being shown and use that context to provide more specific and relevant content advice. For example, if they show you a product or a draft design, comment on it and suggest improvements.`
          }]
        },
        tools: [
          // Google Search tool - for real-time information lookup
          { googleSearch: {} },
          // Function declarations for content generation - simplified with query parameter
          {
            functionDeclarations: [
              {
                name: 'generate_tiktok_script',
                description: 'Generate a TikTok/Reels/Shorts video script. Call when user wants short-form vertical video content. Provide complete details in the query.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Detailed query including: topic/niche, target audience, video hook idea, key message points, desired tone (funny/educational/inspiring), call-to-action, and any specific trends to incorporate' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'generate_instagram_post',
                description: 'Generate Instagram post content including captions, carousel ideas, or Stories scripts. Call when user wants Instagram-specific content.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Detailed query including: content type (post/carousel/story/reel), topic/niche, target audience, brand voice, key message, hashtag preferences, call-to-action, and visual style suggestions' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'generate_youtube_script',
                description: 'Generate YouTube video script for long-form content. Call when user wants YouTube videos, tutorials, or educational content.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Detailed query including: video topic, target audience, video length preference, content structure (intro/body/outro), key points to cover, tone and style, call-to-action, and SEO keywords to target' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'generate_linkedin_post',
                description: 'Generate LinkedIn post for professional networking and B2B content. Call when user wants LinkedIn-specific professional content.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Detailed query including: topic/industry focus, target professional audience, key insights or lessons, personal story elements, professional tone, call-to-action, and relevant industry hashtags' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'generate_twitter_thread',
                description: 'Generate Twitter/X thread or tweet content. Call when user wants Twitter threads, viral tweets, or X content.',
                parameters: {
                  type: 'object',
                  properties: {
                    query: { type: 'string', description: 'Detailed query including: thread topic, number of tweets preferred, hook for first tweet, key points per tweet, target audience, tone (witty/professional/educational), call-to-action, and relevant hashtags' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'write_content',
                description: 'Deliver well-structured, professionally formatted written content. Use this when user asks for content "in written form", "provide it written", "give me in text", wants documentation, or any content they can copy. Return README-style responses with proper headings, bullet points, and clear structure.',
                parameters: {
                  type: 'object',
                  properties: {
                    content: { type: 'string', description: 'The full written content formatted with markdown headings, bullet points, and clear structure' }
                  },
                  required: ['content']
                }
              }
            ]
          }
        ]
      }
    });
  } catch (error: any) {
    console.error('Error in token endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get config' },
      { status: 500 }
    );
  }
}
