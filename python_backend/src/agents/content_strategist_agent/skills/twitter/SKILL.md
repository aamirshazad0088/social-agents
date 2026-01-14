---
name: twitter
description: Use this skill for Twitter/X content creation including tweets, threads, and engagement strategies
---
# Twitter/X Content Skill

This skill provides structured workflows for creating engaging Twitter/X content.

## When to Use This Skill

Use this skill when asked to:
- Write tweets or tweet threads
- Create Twitter engagement strategies
- Draft announcements for Twitter
- Develop Twitter content calendars
- Optimize content for Twitter virality

## Research First (Required)

**Before creating Twitter content, you MUST delegate research:**

```
task(
    subagent_type="researcher",
    description="Research trending [TOPIC] on Twitter/X. Save findings to research/[slug].md"
)
```

## Platform Guidelines

### Tweet Format
- **Character limit**: 280 characters per tweet
- **Threads**: Use for longer content (numbered format)
- **Hashtags**: 1-2 per tweet maximum
- **Brevity**: Get to the point fast

### Single Tweet Template
```
[Hook/insight/take]

[Optional: Supporting point or example]

[Optional: 1 hashtag]
```

### Thread Structure

**Opening Tweet (1/🧵):**
```
1/🧵 [Compelling hook that promises value]

↓
```

**Body Tweets (2-N):**
```
2/ [Key point 1]

3/ [Key point 2 with example]

4/ [Key point 3]
```

**Closing Tweet:**
```
X/ [Summary + CTA]

If this was helpful:
• Follow @handle for more
• RT the first tweet

[Link if applicable]
```

## Content Types

### Hot Takes
Strong opinions that spark discussion:
```
Unpopular opinion: [Controversial but defensible take]

Here's why:
```

### Tips/Advice
Actionable micro-content:
```
Quick tip for [audience]:

[Specific, actionable advice]

This works because [brief reason].
```

### Thread Templates

**"How to" Thread:**
```
1/🧵 How to [achieve outcome] in [timeframe]:

A step-by-step breakdown:

2/ Step 1: [Action]
[Brief explanation]

3/ Step 2: [Action]
[Brief explanation]

...

X/ That's it!

Bookmark this for later 🔖
```

**"Lessons Learned" Thread:**
```
1/🧵 [Number] lessons from [experience]:

2/ Lesson 1: [Title]
→ [Explanation]

3/ Lesson 2: [Title]
→ [Explanation]

...
```

**"Breakdown" Thread:**
```
1/🧵 I analyzed [subject].

Here's what I found:

2/ [Finding 1 with data/example]

3/ [Finding 2 with data/example]

...
```

## Engagement Strategies

### Reply Starters
- Ask a question at the end
- Use "Reply with your [X]"
- Create polls for binary questions

### Retweet Hooks
- "RT if you agree"
- "Save this for later"
- "Share with someone who needs this"

### Timing Considerations
- Peak engagement: 8-10am, 12-1pm, 5-6pm (local time)
- Weekdays generally outperform weekends
- Space thread tweets 1-2 minutes apart

## Visual Recommendations

- 16:9 aspect ratio for images
- 4-panel screenshots for threads
- GIFs for reactions and humor
- Charts/graphs for data points

## Quality Checklist

Before finalizing content:
- [ ] Each tweet stands alone but connects to thread
- [ ] Under 280 characters per tweet
- [ ] Hook is immediately engaging
- [ ] Maximum 2 hashtags per tweet
- [ ] CTA is clear (follow, RT, reply)
- [ ] Thread numbered correctly (1/🧵)
