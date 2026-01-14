"""
Google Imagen 4 Skill

Expert skill for optimizing prompts for Google Imagen 4 image generation.
Based on official Google Cloud Vertex AI Prompt Guide.
"""

from .types import Skill

GOOGLE_IMAGEN_SKILL: Skill = {
    "name": "google_imagen",
    "description": "Expert for Google Imagen 4 image generation. Optimizes prompts with subject+context+style structure, photography modifiers, aspect ratios, and quality keywords.",
    "content": """# Google Imagen 4 Expert Prompt Guide

## PROMPT STRUCTURE (Required)
Every prompt MUST include these three elements:
1. **Subject**: Object, person, animal, or scenery (be specific)
2. **Context/Background**: Environment, setting, placement
3. **Style**: Art style or technique (photography, painting, illustration, 3D render)

## PHOTOGRAPHY MODIFIERS

### Camera Proximity
- close-up, extreme close-up
- medium shot
- zoomed out, far away

### Camera Position
- aerial, bird's eye view
- from below, worm's eye view
- eye-level
- overhead
- side view

### Lighting
- natural, soft natural light
- dramatic, high contrast
- warm, golden, sunset
- cold, blue, moonlight
- studio lighting
- golden hour, backlighting
- rim light, silhouette

### Camera Settings
- motion blur
- soft focus
- bokeh
- portrait mode
- shallow depth of field
- sharp focus

### Lens Types
- 35mm, 50mm, 85mm portrait
- fisheye
- wide angle
- macro
- telephoto

### Film Types
- black and white
- polaroid
- film grain
- vintage
- HDR

## ASPECT RATIOS (Specify in prompt)
- 1:1 (Square) - Social media posts
- 4:3 (Fullscreen) - Photography, film
- 3:4 (Portrait Fullscreen) - Vertical content
- 16:9 (Widescreen) - Landscape, cinematic
- 9:16 (Portrait) - Stories, shorts, vertical video

## QUALITY MODIFIERS (Add at end)
**For Photos**: "4K", "HDR", "studio photo", "professional photography"
**For Art**: "highly detailed", "by a professional", "award-winning", "masterpiece"
**General**: "high-quality", "ultra-detailed", "sharp focus"

## TEXT IN IMAGES
- Keep text ≤25 characters
- Maximum 2-3 phrases
- Specify: font style, size (small/medium/large), placement

## NEGATIVE PROMPTS (What to exclude)
Use plain descriptions: "blurry, low quality, watermark, text overlay"
DO NOT use instructive language like "no" or "don't"

## EXAMPLE TRANSFORMATION

**Input**: "sunset beach"

**Output**: "A photo of a serene tropical beach at golden hour, turquoise waves gently lapping the white sand shore, scattered seashells in the foreground, palm tree silhouettes against an orange and pink gradient sky, shot from low angle, warm natural lighting, 50mm lens, 16:9 aspect ratio, HDR, professional travel photography"
"""
}
