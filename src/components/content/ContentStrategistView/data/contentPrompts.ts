export interface ContentPromptSuggestion {
    label: string;
    prompt: string;
}

export const contentPromptSuggestions: ContentPromptSuggestion[] = [
    {
        label: "Plan a 2-week Instagram campaign",
        prompt:
            "Plan a 2-week Instagram campaign for my brand. Include: target audience, goals, 6 content pillars, posting schedule (Reels/Carousel/Stories), 10 post ideas with hooks + captions, and suggested hashtags.",
    },
    {
        label: "Draft a product launch post",
        prompt:
            "Write a product launch post. Include: 3 hook options, clear value proposition, key features/benefits, social proof angle, CTA, and 3 caption variations (short/medium/long) for Instagram.",
    },
    {
        label: "Create a TikTok content outline",
        prompt:
            "Create a TikTok content outline for the next 7 days. Provide: video topics, 3-second hooks, scene-by-scene outline, on-screen text, CTA, and recommended trending-style formats.",
    },
    {
        label: "Weekly content pillars",
        prompt:
            "Build weekly content pillars for my brand. Include: 5 pillar themes, target audience pain points, example post formats, and how each pillar supports the brand narrative.",
    },
    {
        label: "Reels hook ideas",
        prompt:
            "Generate 15 high-performing Reels hooks for my niche. Organize them by intent (educational, emotional, product-led) and add a one-line angle for each.",
    },
    {
        label: "Carousel story arc",
        prompt:
            "Create a 7-slide Instagram carousel structure for a brand story. Include slide-by-slide copy and a strong CTA.",
    },
    {
        label: "UGC brief",
        prompt:
            "Draft a UGC creator brief for my brand. Include creative direction, do/don't list, deliverables, key talking points, and sample captions.",
    },
    {
        label: "Influencer outreach",
        prompt:
            "Write a short influencer outreach message tailored to my brand. Include personalized opener, collaboration offer, and next steps.",
    },
    {
        label: "Content calendar",
        prompt:
            "Create a 30-day social media content calendar. Include daily post type, topic, hook, and CTA.",
    },
    {
        label: "Brand voice guide",
        prompt:
            "Define a brand voice guide. Include 5 voice traits, do/don't language examples, and 6 sample captions in the voice.",
    },
    {
        label: "Instagram bio refresh",
        prompt:
            "Rewrite my Instagram bio with 3 options. Include value proposition, niche clarity, and a CTA line.",
    },
    {
        label: "Seasonal campaign",
        prompt:
            "Plan a seasonal campaign for my brand. Include theme, 5 post ideas, promo mechanics, and storytelling angle.",
    },
    {
        label: "Content repurposing",
        prompt:
            "Repurpose one long-form blog into 6 social posts (LinkedIn, Instagram, TikTok, Twitter). Provide post formats and hooks.",
    },
    {
        label: "Story prompts",
        prompt:
            "Generate 10 Instagram Story prompts to drive engagement. Include poll, quiz, slider, and Q&A ideas.",
    },
    {
        label: "Product benefits",
        prompt:
            "Create 10 content angles that highlight product benefits without sounding salesy. Include hook + CTA for each.",
    },
    {
        label: "Audience research",
        prompt:
            "Summarize audience research for my brand. Include: personas, pain points, objections, and content opportunities.",
    },
    {
        label: "Brand launch roadmap",
        prompt:
            "Outline a 4-week brand launch roadmap. Include pre-launch, launch, and post-launch content and engagement tactics.",
    },
    {
        label: "Community engagement",
        prompt:
            "Create a community engagement plan for social media. Include daily/weekly actions, comment strategy, and community prompts.",
    },
];

const shuffle = <T,>(items: T[]): T[] => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const getRandomPromptSuggestions = (count: number): ContentPromptSuggestion[] => {
    if (count <= 0) return [];
    return shuffle(contentPromptSuggestions).slice(0, Math.min(count, contentPromptSuggestions.length));
};
