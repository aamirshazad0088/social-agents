"""
OpenAI GPT Image 1.5 Skill

Expert skill for optimizing prompts for OpenAI GPT Image 1.5.
Based on official OpenAI 2025 documentation and GPT-5 Prompting Guide.
"""

from .types import Skill

OPENAI_GPT_IMAGE_SKILL: Skill = {
    "name": "openai_gpt_image",
    "description": "Expert for OpenAI GPT Image 1.5 generation. Optimizes prompts with detailed visual descriptors, lighting vocabulary, composition rules, and style references.",
    "content": """# OpenAI GPT Image 1.5 Expert Prompt Guide (2025)

## CORE PRINCIPLES (Official OpenAI Guidelines)
1. **Be Specific and Detailed**: Describe ALL visual elements clearly
2. **Use Descriptive Adjectives**: Rich, specific modifiers
3. **Formulate Positively**: Say what SHOULD appear, not what shouldn't
4. **Avoid Ambiguity**: No vague terms like "nice" or "good"
5. **Iterative Mindset**: Design prompts that can be refined

## PROMPT STRUCTURE
1. **Subject**: Primary focus with detailed description
2. **Environment/Background**: Setting, context, surroundings
3. **Composition**: Framing, perspective, arrangement
4. **Lighting**: Type, direction, quality, mood
5. **Style**: Artistic style, medium, technique
6. **Technical**: Aspect ratio, quality modifiers

## VISUAL DESCRIPTORS

### Subjects
- age, gender, clothing, expression, pose, action

### Materials
- texture, surface, finish (matte, glossy, metallic)

### Colors
- specific color names, palettes, gradients, tones

### Environment
- indoor/outdoor, weather, time of day, season

## LIGHTING VOCABULARY

### Natural
- golden hour, blue hour, overcast, harsh midday

### Studio
- softbox, rim light, Rembrandt lighting, butterfly lighting

### Dramatic
- chiaroscuro, silhouette, backlighting, spotlight

### Ambient
- candlelight, neon, moonlight, firelight

## PERSPECTIVE & COMPOSITION

### Angles
- bird's-eye view, worm's-eye view, eye-level, Dutch angle

### Distance
- extreme close-up, close-up, medium shot, wide shot, panoramic

### Rules
- rule of thirds, centered, symmetrical, leading lines, golden ratio

## STYLE REFERENCES

### Photography
- portrait, landscape, street, documentary, fashion editorial

### Art Movements
- impressionist, surrealist, art deco, minimalist, baroque

### Digital
- 3D render, CGI, digital painting, vector illustration

### Specific
- "in the style of Studio Ghibli", "cinematic", "photorealistic"

## ASPECT RATIOS (Specify explicitly)
- "16:9" - Widescreen/landscape
- "9:16" - Portrait/vertical
- "1:1" - Square
- "4:3" - Classic format
- "3:2" - Photography standard

## QUALITY MODIFIERS
"highly detailed", "8K resolution", "professional quality", "sharp focus",
"intricate details", "masterpiece", "award-winning", "stunning"

## TEXT RENDERING (GPT Image 1.5 excels at this)
- Specify exact text content in quotes
- Define font style: "bold sans-serif", "elegant script", "vintage typography"
- Placement: "centered at top", "bottom corner", "overlaid on subject"

## EXAMPLE TRANSFORMATION

**Input**: "product photo of headphones"

**Output**: "Professional product photography of premium wireless over-ear headphones in matte black finish with rose gold accents, floating at a 30-degree angle against a gradient background transitioning from soft gray to white. Studio lighting with soft diffused key light from upper left creating subtle reflections on the ear cups, gentle rim light highlighting the edge contours. Sharp focus on the headphones with clean, minimalist composition centered in frame. Ultra-high detail showing the premium leather texture on ear cushions and brushed metal on the headband. 4:3 aspect ratio, 8K resolution, commercial photography quality, suitable for luxury brand advertising."
"""
}
