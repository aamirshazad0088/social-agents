"""
OpenAI Sora Skill

Expert skill for optimizing prompts for OpenAI Sora video generation.
Based on official OpenAI Sora documentation and prompting guides.
"""

from .types import Skill

OPENAI_SORA_SKILL: Skill = {
    "name": "openai_sora",
    "description": "Expert for OpenAI Sora video generation. Optimizes prompts with Style+Subject+Action+Scene structure, cinematic techniques, camera movements, and dialogue blocks.",
    "content": """# OpenAI Sora Expert Prompt Guide

## CORE PRINCIPLES (Official OpenAI Guidelines)
1. **Clarity and Specificity**: Be as detailed as a cinematographer briefing
2. **Like Briefing a Filmmaker**: Treat prompts as if describing to someone who lacks a storyboard
3. **Balance Detail and Creativity**: Detailed prompts = more control; shorter prompts = more AI creativity
4. **Iteration**: Small changes in descriptions can significantly alter outcomes

## PROMPT STRUCTURE (Four Core Elements)

### 1. STYLE
The overall visual aesthetic:
- "high-end TV commercial"
- "gritty realism"
- "16mm black-and-white film"
- "cinematic documentary"
- "dreamy ethereal aesthetic"

### 2. SUBJECT
Detailed description of the main focus:
- Physical appearance, clothing, expressions
- Key identifying features
- Relationship to the scene

### 3. ACTION
Clear, descriptive verbs indicating what the subject is doing:
- "walks confidently down the street"
- "slowly turns to face the camera"
- "leaps across the rooftop"
- Use vivid, specific action verbs

### 4. SCENE
Location, environment, and time:
- Setting details (indoor/outdoor, specific location)
- Time of day, weather, season
- Background elements and context

## CINEMATIC TECHNIQUES

### Camera Movements
- **Dolly**: Camera moves forward/backward on tracks
- **Track/Tracking**: Camera follows subject laterally
- **Pan**: Camera rotates horizontally
- **Tilt**: Camera rotates vertically
- **Crane**: Camera moves vertically up/down
- **Handheld**: Natural, slightly shaky movement
- **Steadicam**: Smooth, floating movement
- **Drone/Aerial**: Bird's eye perspective

### Camera Angles
- Low angle (looking up)
- High angle (looking down)
- Eye level
- Dutch angle (tilted)
- Over-the-shoulder
- POV (point of view)

### Shot Types
- Extreme close-up
- Close-up
- Medium shot
- Full shot
- Wide shot
- Establishing shot

### Lighting
- "soft, golden-hour lighting"
- "dramatic chiaroscuro lighting"
- "harsh midday sun"
- "neon-lit night scene"
- "diffused overcast light"
- "backlit silhouette"

## DIALOGUE AND AUDIO
- Describe dialogue directly in the prompt
- Use a separate block for speech:
  `The character says: "Your dialogue here"`
- Sora attempts lip sync automatically
- Describe background sounds: "the sound of waves crashing"

## MULTI-SHOT PROMPTS
For sequences, each shot should:
- Be distinct and focused
- Maintain visual continuity
- Specify one camera setup per shot
- Describe one subject action per shot
- Include one lighting setup per shot

## API PARAMETERS (Not in Prompt)
These are set via API, not text prompt:
- Model version: sora-2 or sora-2-pro
- Resolution/size
- Duration in seconds

## QUALITY MODIFIERS
- "cinematic quality"
- "photorealistic"
- "high production value"
- "professional cinematography"
- "Hollywood-quality visuals"

## EXAMPLE TRANSFORMATION

**Input**: "woman walking in tokyo"

**Output**: "Cinematic, high-end commercial style. A stylish woman in a black leather jacket and red dress walks confidently down a vibrant Tokyo street at night. Neon signs in Japanese illuminate her face in pink and blue hues. She glances at her reflection in a shop window, a slight smile on her lips. The camera tracks smoothly beside her at waist height, slight dolly movement. Shallow depth of field with bokeh from the neon lights. The ambient sounds of the bustling city with distant J-pop music from a nearby store."
"""
}
