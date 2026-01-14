"""
Runway Gen-3 Alpha Skill

Expert skill for optimizing prompts for Runway Gen-3 Alpha video generation.
Based on official Runway Gen-3 Prompting Guide.
"""

from .types import Skill

RUNWAY_GEN3_SKILL: Skill = {
    "name": "runway_gen3",
    "description": "Expert for Runway Gen-3 Alpha video generation. Optimizes prompts with [camera]: [scene] structure, positive phrasing, camera movements, and vivid motion verbs.",
    "content": """# Runway Gen-3 Alpha Expert Prompt Guide

## CORE RULES (Official Runway Guidelines)
1. **Descriptive, Not Conversational**: No "please make me a video"
2. **Positive Phrasing ONLY**: Describe what SHOULD appear
   - ✓ "clear sky" 
   - ✗ "sky with no clouds"
3. **Specific and Detailed**: Like briefing a new collaborator
4. **Reinforce Key Elements**: Important details can be repeated

## PROMPT STRUCTURE (Recommended Format)
`[camera movement]: [establishing scene]. [additional details about lighting, style, atmosphere]`

## CAMERA MOVEMENTS (Be specific about speed/direction)

### Static
- locked-off shot, tripod shot, static frame

### Motion
- Tracking shot: "camera smoothly tracks alongside the running athlete"
- Dolly: "slow dolly in towards the subject's face"
- Pan: "camera pans left to reveal the cityscape"
- Tilt: "camera tilts up from feet to sky"
- Zoom: "smooth zoom into the eye"
- Crane: "crane shot rising above the crowd"
- Handheld: "handheld camera follows closely behind"

### Speed
- slowly, smoothly, rapidly, gracefully

## CAMERA ANGLES
- Low angle (looking up)
- High angle (looking down)
- Overhead / bird's eye
- FPV (first-person view)
- Dutch angle (tilted)
- Eye level
- Worm's eye (extreme low)

## CAMERA TYPES
- Wide angle
- Close-up
- Extreme close-up
- Macro cinematography
- Medium shot
- Full body shot

## LIGHTING KEYWORDS
- Diffused lighting, soft light
- Silhouette, backlighting
- Lens flare, sun rays
- Side-lit, rim lighting
- Colored gel lighting
- Bright midday sun
- Dramatic shadows
- Golden hour, blue hour
- Neon glow, practical lighting

## STYLE KEYWORDS
- Cinematic, filmic
- Moody, atmospheric
- Vibrant, saturated
- Muted, desaturated
- Iridescent, ethereal
- Gritty, raw
- Dreamlike, surreal

## MOTION VERBS (Use vivid action words)
- Moves → glides, drifts, rushes, sweeps
- Grows → emerges, blooms, unfolds, expands
- Falls → tumbles, cascades, plummets, floats down
- Appears → materializes, fades in, crystallizes

## COHESIVENESS RULE
All elements must be logically consistent. Don't mix conflicting eras/styles unless intentional.

## IMAGE + TEXT PROMPTING
When using with input image, describe MOVEMENT only, not the image content again.

## EXAMPLE TRANSFORMATION

**Input**: "car driving through city"

**Output**: "Tracking shot: A sleek silver sports car glides through rain-slicked city streets at night. Neon signs reflect off the wet asphalt in streaks of pink, blue, and orange. Camera: low angle tracking shot following the car from street level, slight handheld movement for energy. The car's headlights cut through light rain, windshield wipers sweeping rhythmically. Cinematic lighting with dramatic contrasts between neon highlights and deep shadows. Puddles splash as tires pass. Moody, atmospheric urban aesthetic with a sense of motion and speed."
"""
}
