---
name: instagram
description: Use this skill for Instagram content creation including posts, reels, stories, and carousels
---
# Instagram Content Skill

This skill provides structured workflows for creating engaging Instagram content.

## When to Use This Skill

Use this skill when asked to:
- Create Instagram posts or captions
- Plan Instagram Reels or Stories
- Develop carousel content
- Create Instagram content calendars
- Optimize existing Instagram content

## Research First (Required)

**Before creating any Instagram content, you MUST delegate research:**

1. Use the `task` tool with `subagent_type: "researcher"`
2. In the description, specify BOTH the topic AND where to save:

```
task(
    subagent_type="researcher",
    description="Research [TOPIC] Instagram trends. Save findings to research/[slug].md"
)
```

Example:
```
task(
    subagent_type="researcher",
    description="Research fitness content trends on Instagram 2025. Save findings to research/fitness-instagram.md"
)
```

## Platform Guidelines

### Caption Format
- **Character limit**: 2,200 characters max
- **Visible preview**: First 125 characters before "...more"
- **Hook placement**: Most important message in first line
- **Line breaks**: Use for readability (every 2-3 sentences)

### Hashtag Strategy
- Use 5-15 relevant hashtags
- Mix of popular (1M+), moderate (100K-1M), and niche (<100K) tags
- Place at end of caption or in first comment
- Research trending hashtags for each topic

### Content Types

**Feed Posts (Single Image)**
```
[Hook - compelling first line]

[Value - main content, tips, insights]

[CTA - question or action]

.
.
.
#hashtag1 #hashtag2 #hashtag3
```

**Carousels (Multiple Images)**
- Slide 1: Hook/Promise
- Slides 2-9: Value delivery
- Slide 10: CTA + save/share prompt

**Reels (Short Video)**
- First 3 seconds: Hook
- 15-60 seconds ideal length
- Trending audio when relevant
- On-screen text for accessibility

**Stories**
- Interactive elements (polls, questions, sliders)
- Behind-the-scenes content
- Time-sensitive announcements
- Direct CTAs with link stickers

## Visual Recommendations

When content needs images, suggest:
- Aspect ratio: 1:1 (square) or 4:5 (portrait) for feed
- 9:16 for Reels and Stories
- Use brand colors and consistent visual style
- Include text overlays for key points

## Quality Checklist

Before finalizing content:
- [ ] Hook captures attention in first line
- [ ] Provides clear value to audience
- [ ] CTA is specific and actionable
- [ ] Hashtags are relevant and varied
- [ ] Content matches brand voice
- [ ] Visual suggestions included
