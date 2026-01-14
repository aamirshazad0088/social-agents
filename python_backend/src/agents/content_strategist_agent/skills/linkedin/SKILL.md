---
name: linkedin
description: Use this skill for LinkedIn content creation including posts, articles, and thought leadership
---
# LinkedIn Content Skill

This skill provides structured workflows for creating professional LinkedIn content.

## When to Use This Skill

Use this skill when asked to:
- Write LinkedIn posts
- Create thought leadership content
- Draft professional announcements
- Develop LinkedIn content strategies
- Repurpose content for LinkedIn

## Research First (Required)

**Before creating any LinkedIn content, you MUST delegate research:**

```
task(
    subagent_type="researcher",
    description="Research [TOPIC] for LinkedIn professionals. Save findings to research/[slug].md"
)
```

## Platform Guidelines

### Post Format
- **Character limit**: 3,000 characters max
- **Visible preview**: ~210 characters before "see more"
- **Hook critical**: First line must compel click
- **Use line breaks**: Create scannable content

### Content Structure

**Standard Post Template:**
```
[Hook - 1 compelling line that stops the scroll]

[Empty line]

[Context - why this matters to professionals]

[Empty line]

[Main insight - 2-3 short paragraphs with key points]
• Bullet point 1
• Bullet point 2
• Bullet point 3

[Empty line]

[Call to action or engaging question]

#hashtag1 #hashtag2 #hashtag3
```

### Tone Guidelines

- **Professional but personal**: Use "I" and share experiences
- **Insight-driven**: Share learnings, not just announcements
- **Vulnerable when appropriate**: Admit mistakes, share challenges
- **Value-first**: Every post should teach or inspire

### Hashtag Strategy

- Use 3-5 hashtags maximum
- Place at the end of post
- Mix industry-specific and broader professional tags
- Examples: #Leadership #CareerGrowth #[IndustrySpecific]

## Content Types

### Insight Posts
Share professional learnings:
```
I spent 10 years believing [common misconception].

Here's what I learned:

[3-5 key insights with specifics]

What's a belief you've changed in your career?
```

### Story Posts
Professional journey narratives:
```
In 2020, I [challenging situation].

Here's what happened:

[Story with specific details]

The lesson: [Takeaway]
```

### List Posts
Actionable frameworks:
```
[Number] [topic] tips I wish I knew earlier:

1. [Point with brief explanation]
2. [Point with brief explanation]
3. [Point with brief explanation]

Which resonates most with you?
```

### Announcement Posts
Professional updates:
```
Excited to share: [News]

[Context - why this matters]

[What's next]

[Gratitude or invitation to connect]
```

## Visual Recommendations

- Use professional imagery
- Document graphics with key stats
- Carousels for multi-point content
- Native documents for long-form guides

## Quality Checklist

Before finalizing content:
- [ ] Hook stops the professional scroll
- [ ] Provides actionable insight or value
- [ ] Tone matches professional context
- [ ] CTA encourages meaningful engagement
- [ ] 3-5 relevant hashtags included
- [ ] Personal perspective included where appropriate
