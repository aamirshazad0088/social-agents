---
name: content-calendar
description: Use this skill for content planning, calendars, and multi-platform strategies
---
# Content Calendar Skill

This skill provides structured workflows for content planning and calendar creation.

## When to Use This Skill

Use this skill when asked to:
- Create a content calendar or schedule
- Plan content for multiple platforms
- Develop a content strategy
- Map content to campaigns or goals
- Plan content around events or seasons

## Research First (Required)

**Before creating any content calendar, you MUST delegate research:**

```
task(
    subagent_type="researcher",
    description="Research [BRAND/INDUSTRY] content trends and upcoming events. Save findings to research/[slug]-calendar.md"
)
```

## Content Calendar Structure

### Weekly Calendar Template

```markdown
# [Brand/Client] Content Calendar
## Week of [Date Range]

### Monday
| Platform | Content Type | Topic | Status |
|----------|--------------|-------|--------|
| Instagram | Carousel | [Topic] | Draft |
| LinkedIn | Post | [Topic] | Scheduled |

### Tuesday
| Platform | Content Type | Topic | Status |
|----------|--------------|-------|--------|
| Twitter | Thread | [Topic] | Draft |

### Wednesday
...

### Key Dates This Week
- [Event/Holiday] on [Date]
- [Campaign Launch] on [Date]
```

### Monthly Overview Template

```markdown
# [Month] Content Calendar

## Themes
- Week 1: [Theme]
- Week 2: [Theme]
- Week 3: [Theme]
- Week 4: [Theme]

## Key Dates & Events
- [Date]: [Event/Holiday]
- [Date]: [Industry Event]
- [Date]: [Campaign milestone]

## Content Mix
- Educational: 40%
- Promotional: 20%
- Engagement: 25%
- Behind-the-scenes: 15%

## Platform Breakdown
| Platform | Posts/Week | Focus |
|----------|------------|-------|
| Instagram | 5 | Visual storytelling |
| LinkedIn | 3 | Thought leadership |
| Twitter | 7 | Engagement & news |
```

## Content Pillars Framework

Define 3-5 content pillars for the brand:

```markdown
## Content Pillars

### 1. [Pillar Name] (30%)
**Purpose**: [What this accomplishes]
**Topics**: [List of topics]
**Formats**: [Best formats for this pillar]

### 2. [Pillar Name] (25%)
**Purpose**: [What this accomplishes]
**Topics**: [List of topics]
**Formats**: [Best formats for this pillar]

### 3. [Pillar Name] (25%)
**Purpose**: [What this accomplishes]
**Topics**: [List of topics]
**Formats**: [Best formats for this pillar]

### 4. [Pillar Name] (20%)
**Purpose**: [What this accomplishes]
**Topics**: [List of topics]
**Formats**: [Best formats for this pillar]
```

## Campaign Planning

For campaign-specific calendars:

```markdown
# [Campaign Name] Content Plan

## Campaign Details
- **Objective**: [Goal]
- **Duration**: [Start] - [End]
- **Target Audience**: [Who]
- **Key Message**: [Core message]

## Phase 1: Teaser (Week 1)
- [Platform]: [Content type] - [Topic]
- [Platform]: [Content type] - [Topic]

## Phase 2: Launch (Week 2)
- [Platform]: [Content type] - [Topic]
- [Platform]: [Content type] - [Topic]

## Phase 3: Sustain (Weeks 3-4)
- [Platform]: [Content type] - [Topic]
- [Platform]: [Content type] - [Topic]

## Phase 4: Close (Final Week)
- [Platform]: [Content type] - [Topic]
```

## Platform Posting Frequency

Recommended frequencies by platform:

| Platform | Minimum | Optimal | Maximum |
|----------|---------|---------|---------|
| Instagram Feed | 3/week | 5/week | 1-2/day |
| Instagram Stories | Daily | 3-5/day | 10/day |
| Instagram Reels | 2/week | 4/week | 1/day |
| LinkedIn | 2/week | 3-5/week | 1/day |
| Twitter/X | 1/day | 3-5/day | 10/day |
| TikTok | 1/day | 3/day | 5/day |
| Facebook | 1/day | 1-2/day | 3/day |
| YouTube | 1/week | 2-3/week | 1/day |

## Best Times to Post

General guidelines (adjust based on audience data):

| Platform | Best Times | Best Days |
|----------|------------|-----------|
| Instagram | 11am, 2pm, 7pm | Tue, Wed, Fri |
| LinkedIn | 7-8am, 12pm, 5-6pm | Tue, Wed, Thu |
| Twitter | 8am, 12pm, 5pm | Mon-Fri |
| TikTok | 7am, 12pm, 3pm, 7pm | Tue, Thu, Fri |
| Facebook | 1-4pm | Wed, Thu, Fri |

## Seasonal Content Ideas

Plan content around:
- Major holidays
- Industry events
- Awareness days/months
- Seasonal trends
- Product/service launches
- Company milestones

## Quality Checklist

Before finalizing calendar:
- [ ] Content aligns with brand pillars
- [ ] Mix of content types included
- [ ] Key dates and events covered
- [ ] Realistic posting frequency
- [ ] Platform-appropriate content assigned
- [ ] Room for reactive/trending content
- [ ] Clear ownership and deadlines
