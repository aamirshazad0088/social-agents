---
name: youtube
description: Use this skill for YouTube content including video scripts, titles, descriptions, and SEO
---
# YouTube Content Skill

This skill provides structured workflows for YouTube content creation and optimization.

## When to Use This Skill

Use this skill when asked to:
- Write YouTube video scripts
- Create video titles and descriptions
- Plan YouTube content strategy
- Optimize for YouTube SEO
- Develop YouTube Shorts content

## Research First (Required)

```
task(
    subagent_type="researcher",
    description="Research YouTube trends for [TOPIC] and competitor analysis. Save findings to research/[slug]-youtube.md"
)
```

## Platform Guidelines

### Long-Form Video Structure

**Script Template:**
```
[HOOK - 0-30 seconds]
- Attention-grabbing statement
- Promise of value
- Preview what's coming

[INTRO - 30-60 seconds]
- Brief channel introduction
- Why this topic matters
- Establish credibility

[MAIN CONTENT - 2-10+ minutes]
Section 1: [Topic]
- Key point
- Examples/demonstrations
- Transition

Section 2: [Topic]
- Key point
- Examples/demonstrations
- Transition

Section 3: [Topic]
- Key point
- Examples/demonstrations

[CONCLUSION - 30-60 seconds]
- Recap key points
- CTA (subscribe, like, comment)
- Teaser for next video
```

### YouTube Shorts Structure
```
[HOOK - 0-2 seconds]
[Single focused point - 30-58 seconds]
[CTA or punchline - 2-3 seconds]
```

## Title Optimization

### Title Formulas
- "How to [Achieve Result] in [Timeframe]"
- "[Number] [Topic] Mistakes Killing Your [Goal]"
- "[Shocking Statement] | [Clarification]"
- "I Tried [Thing] for [Duration]. Here's What Happened"
- "The REAL Reason [Phenomenon]"
- "[Topic] Explained in [Time/Words]"

### Title Best Practices
- Under 60 characters (mobile-friendly)
- Front-load keywords
- Include numbers when relevant
- Create curiosity without clickbait
- Use CAPS sparingly for emphasis

## Description Optimization

**Description Template:**
```
[2-3 sentence summary of video content with main keywords]

🔔 SUBSCRIBE: [Channel link]

📚 In this video:
00:00 - Introduction
02:15 - [Section 1 Title]
05:30 - [Section 2 Title]
09:45 - [Section 3 Title]
12:00 - Conclusion

📌 Key Takeaways:
• [Point 1]
• [Point 2]
• [Point 3]

🔗 Resources Mentioned:
• [Resource 1]: [Link]
• [Resource 2]: [Link]

📱 Connect with us:
• Instagram: [Link]
• Twitter: [Link]
• Website: [Link]

#keyword1 #keyword2 #keyword3

[Additional SEO paragraph with naturally placed keywords]
```

## Thumbnail Concepts

Recommend thumbnail elements:
- High contrast colors
- Clear facial expression (if person-based)
- Large, readable text (3-4 words max)
- Visual representation of topic
- Consistent branding elements

### Thumbnail Prompt Elements
- Subject/person positioning
- Text overlay suggestions
- Color scheme recommendations
- Emotional expression guidance

## SEO Best Practices

### Keyword Placement
1. Title (primary keyword)
2. Description (first 150 characters)
3. Tags (10-15 relevant tags)
4. Closed captions/transcript
5. Filename before upload

### Tag Strategy
- Primary keyword
- Secondary keywords (3-5)
- Related topics (5-10)
- Channel name
- Series name if applicable

## Content Types

### Educational Videos
- Clear learning objectives
- Step-by-step structure
- Visual demonstrations
- Summary at end

### Entertainment/Vlog
- Story arc (beginning, middle, end)
- Personality-driven
- Behind-the-scenes moments
- Authentic reactions

### Product Reviews
- Pros and cons balanced
- Comparison to alternatives
- Personal use examples
- Clear recommendation

### Tutorials
- Prerequisites stated upfront
- Downloadable resources mentioned
- Common mistakes addressed
- Follow-along pacing

## Quality Checklist

Before finalizing content:
- [ ] Hook captures attention in first 30 seconds
- [ ] Title under 60 characters with keyword
- [ ] Description includes timestamps
- [ ] Tags cover primary and related keywords
- [ ] Thumbnail concept is attention-grabbing
- [ ] CTA is natural and specific
- [ ] Script has clear structure with transitions
