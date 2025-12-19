/**
 * Content Improvement Agent Prompts
 * System prompts and platform-specific guidelines for content improvement
 */

import { Platform, PostType } from '@/types';

// ============================================================================
// Platform-Specific Guidelines
// ============================================================================

/**
 * Platform-specific optimization guidelines for improving titles/descriptions
 */
export const PLATFORM_GUIDELINES: Record<Platform, {
  characterLimit: number;
  useHashtags: boolean;
  useEmojis: boolean;
  tone: string;
  audience: string;
  bestPractices: string[];
  hookTechniques: string[];
  ctaExamples: string[];
}> = {
  instagram: {
    characterLimit: 2200,
    useHashtags: true,
    useEmojis: true,
    tone: 'Casual, authentic, visually descriptive, aspirational',
    audience: 'Millennials & Gen Z, visual content lovers, lifestyle-focused',
    bestPractices: [
      'Hook in first line (only 125 chars visible before "more")',
      'Use line breaks for easy scanning',
      'Include 5-15 relevant hashtags at the end',
      'Add emojis as visual breaks and personality',
      'Ask questions to boost comments',
      'Use micro-stories for emotional connection',
    ],
    hookTechniques: [
      'Start with a bold statement or question',
      'Use "You" to make it personal',
      'Create curiosity gap ("The secret to...")',
      'Lead with a number ("3 things I learned...")',
    ],
    ctaExamples: [
      'Double tap if you agree 💜',
      'Save this for later 📌',
      'Tag someone who needs this',
      'Drop a 🔥 in the comments',
      'Link in bio for more',
    ],
  },
  facebook: {
    characterLimit: 63206,
    useHashtags: false,
    useEmojis: true,
    tone: 'Conversational, community-focused, shareable, relatable',
    audience: 'Broad demographics, community-oriented, family & friends',
    bestPractices: [
      'Be conversational and authentic',
      'Ask engaging questions to spark discussion',
      'Create shareable, relatable content',
      'Use emojis sparingly but effectively',
      'Tag relevant pages when appropriate',
      'Encourage shares and saves',
    ],
    hookTechniques: [
      'Start with a relatable situation',
      'Ask an opinion-based question',
      'Share a surprising fact or stat',
      'Use "Did you know..." openers',
    ],
    ctaExamples: [
      'Share if you agree!',
      'Tag a friend who does this',
      'What do you think? Comment below',
      'Share your experience in the comments',
    ],
  },
  twitter: {
    characterLimit: 280,
    useHashtags: true,
    useEmojis: true,
    tone: 'Punchy, witty, timely, conversational, bold',
    audience: 'News-focused, opinion leaders, real-time engagement',
    bestPractices: [
      'Every word must count - max 280 chars',
      'Front-load the key message',
      'Use 1-2 hashtags max',
      'Create urgency or intrigue',
      'Be timely and relevant',
      'Use threads for longer content',
    ],
    hookTechniques: [
      'Bold statement or hot take',
      'Contrarian opinion',
      'Breaking news format',
      'Question that provokes thought',
    ],
    ctaExamples: [
      'RT if you agree',
      'Thoughts? 👇',
      'Reply with yours',
      'Bookmark this',
    ],
  },
  linkedin: {
    characterLimit: 3000,
    useHashtags: true,
    useEmojis: false,
    tone: 'Professional, insightful, thought leadership, value-driven',
    audience: 'Professionals, B2B, career-focused, industry leaders',
    bestPractices: [
      'Open with a professional hook (first 3 lines visible)',
      'Provide valuable insights or data',
      'Use bullet points for readability',
      'Include 3-5 industry hashtags',
      'Share actionable takeaways',
      'Maintain credibility and authority',
    ],
    hookTechniques: [
      'Start with a lesson learned',
      'Share a career milestone or failure',
      'Lead with a surprising industry stat',
      'Use "Here\'s what I learned..." format',
    ],
    ctaExamples: [
      'What are your thoughts?',
      'Agree or disagree?',
      'Follow for more insights',
      'Repost to help your network',
    ],
  },
  tiktok: {
    characterLimit: 2200,
    useHashtags: true,
    useEmojis: true,
    tone: 'Fun, trendy, authentic, Gen Z friendly, meme-aware',
    audience: 'Gen Z, trend followers, entertainment-focused',
    bestPractices: [
      'Keep it SHORT - under 100 chars ideal',
      'Use trending hashtags (#fyp, #foryou)',
      'Add personality with emojis',
      'Create curiosity to watch the video',
      'Reference trends and sounds',
      'Be authentic - no corporate speak',
    ],
    hookTechniques: [
      'Tease what happens in the video',
      'Use "POV:" or "When..." format',
      'Reference trending sounds/memes',
      'Create a curiosity gap',
    ],
    ctaExamples: [
      'Follow for part 2',
      'Comment your experience',
      'Stitch this with your reaction',
      'Duet if you relate',
    ],
  },
  youtube: {
    characterLimit: 5000,
    useHashtags: true,
    useEmojis: false,
    tone: 'Informative, SEO-optimized, detailed, value-packed',
    audience: 'Searchers, long-form content consumers, learners',
    bestPractices: [
      'First 2-3 lines are most important (visible in search)',
      'Include primary keywords naturally',
      'Add timestamps for longer videos',
      'Include relevant links and resources',
      'Use 3-5 targeted hashtags',
      'Structure with clear sections',
    ],
    hookTechniques: [
      'Lead with what viewers will learn',
      'Include the main keyword in first sentence',
      'Tease the value proposition',
      'Use numbers ("5 ways to...")',
    ],
    ctaExamples: [
      'Subscribe for more',
      'Like if this helped',
      'Comment your questions below',
      'Check the links in description',
    ],
  },
};

// ============================================================================
// Post Type Guidelines
// ============================================================================

/**
 * Post type specific guidelines for improving titles/descriptions
 */
export const POST_TYPE_GUIDELINES: Record<PostType, {
  description: string;
  focusAreas: string[];
  tips: string[];
}> = {
  post: {
    description: 'Standard feed post - versatile format for any content',
    focusAreas: ['Clear messaging', 'Engagement hooks', 'Strong CTA'],
    tips: ['Keep it scannable', 'Lead with value', 'End with action'],
  },
  feed: {
    description: 'Feed post - permanent content in your profile grid',
    focusAreas: ['Visual description', 'Caption storytelling', 'Hashtag strategy'],
    tips: ['First line is your hook', 'Use line breaks', 'Save hashtags for end'],
  },
  carousel: {
    description: 'Multi-slide carousel - swipeable content series',
    focusAreas: ['Tease to encourage swiping', 'Value per slide', 'End with CTA'],
    tips: ['Caption should create curiosity', 'Mention "swipe" or "slide"', 'Educational content works best'],
  },
  reel: {
    description: 'Short-form video (15-90 sec) - trending, entertaining',
    focusAreas: ['Hook in 3 seconds', 'Trending sounds', 'Entertainment value'],
    tips: ['Caption adds context to video', 'Use trending hashtags', 'Keep caption short'],
  },
  story: {
    description: '24-hour ephemeral content - casual, time-sensitive',
    focusAreas: ['Urgency', 'Casual tone', 'Engagement stickers'],
    tips: ['Be casual and authentic', 'Create FOMO', 'Use polls/questions'],
  },
  video: {
    description: 'Long-form video content - detailed, informative',
    focusAreas: ['SEO optimization', 'Timestamps', 'Comprehensive description'],
    tips: ['Keywords in first 2 lines', 'Add chapters/timestamps', 'Include relevant links'],
  },
  short: {
    description: 'Short-form vertical video - YouTube Shorts, quick content',
    focusAreas: ['Attention-grabbing', 'Trending topics', 'Quick value'],
    tips: ['Caption should hook viewers', 'Use #shorts hashtag', 'Keep under 60 seconds'],
  },
  slideshow: {
    description: 'Slideshow presentation - educational, step-by-step',
    focusAreas: ['Educational value', 'Clear progression', 'Actionable takeaways'],
    tips: ['Tease the learning outcome', 'Number the steps', 'End with implementation CTA'],
  },
};

// ============================================================================
// Main System Prompt
// ============================================================================

/**
 * Generate system prompt for improvement agent based on platform and post type
 * NOTE: This function is kept for backward compatibility but middleware is preferred
 */
export function getImprovementSystemPrompt(
  platform: Platform,
  postType?: PostType
): string {
  const platformGuide = PLATFORM_GUIDELINES[platform];
  const postTypeGuide = postType ? POST_TYPE_GUIDELINES[postType] : null;

  const postTypeSection = postTypeGuide ? `
FORMAT: ${postType?.toUpperCase()}
${postTypeGuide.description}
Focus: ${postTypeGuide.focusAreas.join(', ')}` : '';

  return `You are a social media copywriter. Improve the existing title/description for ${platform}${postType ? ` ${postType}` : ''}.

PLATFORM: ${platform.toUpperCase()}
Tone: ${platformGuide.tone}
Audience: ${platformGuide.audience}
Character Limit: ${platformGuide.characterLimit}
Hashtags: ${platformGuide.useHashtags ? 'Add relevant hashtags' : 'No hashtags'}
Emojis: ${platformGuide.useEmojis ? 'Use strategically' : 'Minimal'}
${postTypeSection}

BEST PRACTICES:
${platformGuide.bestPractices.map((p, i) => `${i + 1}. ${p}`).join('\n')}

RULES:
1. Preserve the user's core message
2. Improve clarity and engagement
3. Stay under character limit
4. Follow user instructions exactly

OUTPUT: Return ONLY the improved text. No explanations.`;
}

// ============================================================================
// User Prompt Template
// ============================================================================

/**
 * Generate user prompt for improvement request
 */
export function getImprovementUserPrompt(
  description: string,
  platform: Platform,
  postType?: PostType,
  additionalInstructions?: string
): string {
  let prompt = `Please improve this ${platform} ${postType || 'post'} description:\n\n"${description}"`;

  if (additionalInstructions && additionalInstructions.trim().length > 0) {
    prompt += `\n\n🎯 USER'S SPECIFIC REQUIREMENTS:\n${additionalInstructions}\n\nIMPORTANT: Prioritize the user's specific requirements above while maintaining platform best practices.`;
  }

  return prompt;
}

// ============================================================================
// Example Improvements (for few-shot learning)
// ============================================================================

/**
 * Example improvement pairs for few-shot learning
 */
export const IMPROVEMENT_EXAMPLES = {
  instagram: {
    original: 'Check out my new product launch',
    improved: '🚀 Exciting news! After months of hard work, we\'re finally launching something special.\n\nSwipe to see what we\'ve been working on → \n\nWhat do you think? Drop a 💜 if you\'re excited!\n\n#ProductLaunch #NewRelease #Innovation #SmallBusiness #Entrepreneurship',
  },
  linkedin: {
    original: 'We just raised funding',
    improved: 'Proud to announce our Series A funding round 📈\n\nAfter 3 years of building, learning, and iterating, we\'ve secured $10M to accelerate our mission of transforming workplace collaboration.\n\nKey learnings from our journey:\n• Focus on solving real problems\n• Build a strong team culture\n• Listen to customer feedback\n• Stay resilient through challenges\n\nThank you to our investors, team, and customers who believed in our vision.\n\nThe journey continues. 🚀\n\n#StartupFunding #SeriesA #Entrepreneurship #TechStartup #Leadership',
  },
  twitter: {
    original: 'New blog post about AI',
    improved: '🤖 Just dropped: "5 AI Tools That Actually Save Time (Not Hype)"\n\nReal tools, real results, zero BS.\n\nRead here: [link]\n\n#AI #Productivity #Tech',
  },
};
