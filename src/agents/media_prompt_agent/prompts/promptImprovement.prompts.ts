/**
 * Media Prompt Improvement Agent Prompts
 * Expert prompt engineering templates for AI-generated media
 */

import { MediaType, MediaSubType, MediaProvider, MediaTypeGuidelines } from '../types/promptImprovement.types';

// ============================================================================
// Media Type Guidelines
// ============================================================================

export const MEDIA_TYPE_GUIDELINES: Record<MediaType, MediaTypeGuidelines> = {
  'image-generation': {
    focusAreas: [
      'Visual composition and framing',
      'Lighting and atmosphere',
      'Color palette and mood',
      'Artistic style and direction',
      'Technical photography details',
      'Subject positioning and scale'
    ],
    technicalTerms: [
      'camera angle (eye-level, bird\'s eye, low angle)',
      'depth of field (shallow, deep)',
      'focal length (wide, telephoto, macro)',
      'lighting (golden hour, studio, natural, dramatic)',
      'composition rules (rule of thirds, symmetry, leading lines)'
    ],
    styleGuidance: [
      'Photorealistic, hyperrealistic, cinematic',
      'Artistic styles: oil painting, watercolor, digital art',
      'Photography styles: portrait, landscape, macro, street',
      'Modern styles: minimalist, maximalist, surreal'
    ],
    examples: 'professional photography, artistic direction, visual storytelling',
    maxLength: 1000,
  },
  'image-editing': {
    focusAreas: [
      'Specific edit instructions',
      'Target areas and regions',
      'Style consistency',
      'Blend quality and transitions',
      'Transformation details'
    ],
    technicalTerms: [
      'masking and selection',
      'color grading and correction',
      'texture matching',
      'seamless blending',
      'object removal/addition'
    ],
    styleGuidance: [
      'Maintain original style',
      'Enhance existing elements',
      'Natural integration',
      'Realistic modifications'
    ],
    examples: 'precise editing instructions, transformation goals, style preservation',
    maxLength: 800,
  },
  'video-generation': {
    focusAreas: [
      'Camera movements and angles',
      'Scene transitions and flow',
      'Motion and dynamics',
      'Cinematography and lighting',
      'Pacing and timing',
      'Visual narrative'
    ],
    technicalTerms: [
      'camera moves (pan, tilt, zoom, dolly, tracking)',
      'shot types (establishing, close-up, medium, wide)',
      'transitions (cut, fade, dissolve)',
      'motion blur and speed',
      'frame composition'
    ],
    styleGuidance: [
      'Cinematic, documentary, commercial',
      'Film aesthetics (noir, vintage, modern)',
      'Visual storytelling techniques',
      'Dynamic camera work'
    ],
    examples: 'cinematic language, motion description, scene choreography',
    maxLength: 1200,
  },
  'video-editing': {
    focusAreas: [
      'Continuity and flow',
      'Scene extensions',
      'Motion consistency',
      'Timing adjustments',
      'Visual coherence'
    ],
    technicalTerms: [
      'frame-by-frame continuity',
      'motion matching',
      'temporal consistency',
      'scene blending',
      'duration control'
    ],
    styleGuidance: [
      'Match existing style',
      'Smooth transitions',
      'Natural progression',
      'Consistent pacing'
    ],
    examples: 'editing instructions, continuity notes, extension details',
    maxLength: 800,
  },
};

// ============================================================================
// SubType-Specific Guidelines (Based on Google Veo 3.1 Official Documentation)
// ============================================================================

export const SUBTYPE_GUIDELINES: Record<MediaSubType, { context: string; tips: string[]; promptElements?: string[]; examplePrompt?: string }> = {
  'text-to-image': {
    context: 'Text-to-image generation. For Google Gemini: Describe narratively, dont list keywords. For OpenAI GPT Image 1: Excellent instruction-following with world knowledge, max 32000 chars.',
    promptElements: [
      // UNIVERSAL ELEMENTS
      'Shot type: close-up portrait, wide shot, medium shot, macro, birds-eye view',
      'Subject: detailed description with descriptive adjectives',
      'Action or expression: what the subject is doing',
      'Environment: the setting, background, and context',
      'Lighting: soft golden hour, studio-lit, dramatic shadows, candlelight, neon',
      'Mood/atmosphere: serene, chaotic, mystical, futuristic, energetic',
      'Camera/lens details: 85mm portrait lens, wide-angle, macro lens',
      'Style/theme: photorealistic, cyberpunk, art deco, minimalist, pixel-art',
      'Key textures and details: what to emphasize',
      'Aspect ratio: square (1:1), portrait (2:3), landscape (3:2)',
      'Color palette: specific colors, warm/cool tones'
    ],
    tips: [
      // UNIVERSAL TIPS
      'BE SPECIFIC AND DETAILED: More detail = better quality for both providers',
      'Use descriptive adjectives: "fluffy, small, brown dog" not just "a dog"',
      'Describe mood/atmosphere explicitly: "serene", "chaotic", "mystical"',
      'Specify perspective and composition: close-up, wide shot, rule of thirds',
      'Include lighting and time of day for dramatic effect',

      // GOOGLE GEMINI TIPS
      'For Gemini: DESCRIBE THE SCENE narratively - a paragraph beats keywords',
      'For Gemini: Provide context and intent (purpose of the image)',
      'For Gemini: Use "semantic negative prompts" - describe positively instead of "no X"',
      'For Gemini: Supports up to 14 reference images and 4K resolution',
      'For Gemini: Google Search grounding for real-time data imagery',

      // OPENAI GPT IMAGE 1 TIPS
      'For GPT Image 1: Excellent at instruction-following - be very detailed',
      'For GPT Image 1: Use style references: "in the style of Van Gogh"',
      'For GPT Image 1: Specify styles/themes: "cyberpunk", "art deco", "minimalist"',
      'For GPT Image 1: For transparent backgrounds, say "transparent PNG"',
      'For GPT Image 1: Text renders well - include exact text needed in prompt',
      'For GPT Image 1: Max prompt length 32000 characters',
      'For GPT Image 1: Supports up to 10 reference images',
      'For GPT Image 1: Model remembers images in same chat - start fresh for independent tasks'
    ],
    examplePrompt: `GOOGLE GEMINI STYLE: A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. The setting is his rustic, sun-drenched workshop. The scene is illuminated by soft, golden hour light streaming through a window, highlighting the fine texture of the clay. Captured with an 85mm portrait lens, resulting in a soft, blurred background (bokeh). The overall mood is serene and masterful. Vertical portrait orientation.

OPENAI GPT IMAGE 1 STYLE: Render a realistic image of this character: Visual Appearance - Body Shape: Amorphous and gelatinous, resembling a teardrop or melting marshmallow. Material Texture: Semi-translucent, bio-luminescent goo with jelly-like wobble. Color Palette: Base iridescent lavender, accents of neon pink and electric blue glowing veins. Facial Features: 3-5 asymmetrical floating orbs as eyes that rotate independently, rippling crescent mouth when speaking. Movement: Constant wiggling at rest, leaves glowing slime trails.`
  },
  'text-to-video': {
    context: 'Video generation from text. Both Veo 3.1 and Sora support native audio generation with dialogue, sound effects, and ambient sounds. Include audio details in prompts for professional results.',
    promptElements: [
      // UNIVERSAL ELEMENTS
      'Subject: The object, person, animal, or scenery with detailed description',
      'Action: What the subject is doing (walking, running, turning)',
      'Style: Creative direction (sci-fi, horror film, film noir, cartoon, cinematic realism)',
      'Camera positioning & motion: aerial view, eye-level, dolly shot, tracking, arc',
      'Composition: How shot is framed (wide shot, close-up, over-shoulder, two-shot)',
      'Focus & lens effects: shallow focus, deep focus, lens focal length (32mm, 50mm, 85mm)',
      'Ambiance: Color and light (blue tones, golden hour, warm-cool split)',

      // SORA-SPECIFIC PROFESSIONAL ELEMENTS
      'Format & Look: Duration, shutter angle, capture style, grain texture, halation',
      'Lenses & Filtration: Specific focal lengths, Pro-Mist, CPL filters',
      'Grade & Palette: Highlights, mids, blacks color treatment',
      'Lighting & Atmosphere: Light direction, time of day, bounce, negative fill, practicals, mist/haze',
      'Location & Framing: Foreground/midground/background elements, avoid list',
      'Wardrobe & Props: Main subject details, extras, specific props',
      'Sound: Diegetic sounds with levels, ambient details',
      'Shot List: Timestamp breakdowns with camera movement per segment',
      'Camera Notes: Eyeline, flare handling, handheld texture',
      'Finishing: Grain overlay, LUT, poster frame'
    ],
    tips: [
      // GOOGLE VEO TIPS
      'For Veo: Use descriptive language with adjectives to paint a clear picture',
      'For Veo dialogue: Use quotes for specific speech ("This must be the key," he murmured)',
      'For Veo sound effects: Explicitly describe sounds (tires screeching loudly, engine roaring)',
      'For Veo ambient noise: Describe environment soundscape (A faint, eerie hum resonates)',
      'For Veo negative prompts: Describe what you dont want without using "no" or "dont"',

      // SORA PROFESSIONAL TIPS
      'For Sora: Structure prompt into sections (Format, Lenses, Grade, Lighting, Location, Wardrobe, Sound, Shot List)',
      'For Sora: Specify technical camera details (180° shutter, 65mm photochemical emulation, fine grain)',
      'For Sora: Include foreground/midground/background scene layers',
      'For Sora: Describe main subject with age, clothing, posture, accessories',
      'For Sora: Add timestamp shot breakdowns (0.00-2.40: "Arrival Drift" 32mm slow dolly left)',
      'For Sora: Describe finishing (grain overlay, halation, warm-cool LUT, poster frame)',

      // SORA NATIVE AUDIO (Like Veo)
      'For Sora audio: Include dialogue in "quotes" for spoken words',
      'For Sora audio: Describe ambient sounds (city noise, nature, crowd murmur)',
      'For Sora audio: Specify music mood (upbeat, orchestral, minimal, emotional)',
      'For Sora audio: Add diegetic sounds (footsteps, fabric rustle, product sounds) with LUFS levels',
      'For Sora audio: Sora generates native audio - be specific about soundscape'
    ],
    examplePrompt: `GOOGLE VEO STYLE: A medium, eye-level shot of a beautiful woman with dark hair. She walks with serene confidence through crystal-clear, shallow turquoise water. The camera slowly pulls back to a medium-wide shot. Cinematic, dreamlike atmosphere with vibrant colors. "The water feels like silk," she whispers. Gentle waves lapping, distant seagulls calling, soft ambient music.

SORA CINEMATOGRAPHY STYLE:
Format & Look: 4s duration; 180° shutter; digital capture emulating 65mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.
Lenses & Filtration: 32mm / 50mm spherical primes; Black Pro-Mist 1/4; slight CPL rotation to manage glass reflections.
Grade / Palette: Highlights - clean morning sunlight with amber lift. Mids - balanced neutrals with slight teal cast in shadows. Blacks - soft, neutral with mild lift for haze retention.
Lighting & Atmosphere: Natural sunlight from camera left, low angle (07:30 AM). Bounce: 4×4 ultrabounce silver. Negative fill from opposite wall. Practical: sodium platform lights on dim fade. Atmos: gentle mist; train exhaust drift through light beam.
Location & Framing: Urban commuter platform, dawn. Foreground: yellow safety line, coffee cup on bench. Midground: waiting passengers silhouetted in haze. Background: arriving train braking to a stop. Avoid signage or corporate branding.
Wardrobe / Props: Main subject: mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side. Extras: commuters in muted tones; one cyclist pushing bike. Props: paper coffee cup, rolling luggage, LED departure board.
Sound: Diegetic only - faint rail screech, train brakes hiss, distant announcement muffled (-20 LUFS), low ambient hum. Footsteps and paper rustle; no score or added foley.
Shot 0.00-2.40: "Arrival Drift" (32mm, shoulder-mounted slow dolly left) - Camera slides past platform signage edge; shallow focus reveals traveler mid-frame. Morning light blooms across lens; train headlights flare softly through mist. Purpose: establish setting and tone.
Shot 2.40-4.00: "Turn and Pause" (50mm, slow arc in) - Tighter over-shoulder arc as train halts; traveler turns slightly toward camera, catching sunlight rim across cheek. Eyes flick up toward something unseen. Purpose: create human focal moment.
Camera Notes: Keep eyeline low for intimacy. Allow micro flares from train glass. Preserve subtle handheld imperfection. Retain skin highlight roll-off.
Finishing: Fine-grain overlay with mild chroma noise; restrained halation on practicals; warm-cool LUT. Poster frame: traveler mid-turn, golden rim light, arriving train soft-focus in background haze.`
  },
  'image-to-video': {
    context: 'Veo 3.1 animates a single image as the starting frame. Select an image closest to what you envision as the first scene to animate objects, bring drawings to life, and add movement and sound.',
    tips: [
      'The input image becomes the initial/first frame of the video',
      'Describe the animation/motion that should occur from this starting frame',
      'Include camera movements that work naturally with the still image composition',
      'Specify what elements in the image should move and how',
      'Add sound effects or ambient audio descriptions for Veo 3.1',
      'Duration options: 4, 6, or 8 seconds'
    ],
    promptElements: [
      'Starting state: Describe what is visible in the image',
      'Motion: What movement should occur from this frame',
      'Camera: How the camera should move (pan, tilt, zoom, dolly)',
      'Audio: Sound effects or ambient sounds to accompany the animation'
    ]
  },
  'inpaint': {
    context: 'OpenAI GPT Image 1 / DALL-E inpainting: Edit specific masked regions while preserving the rest. GPT Image 1 accepts up to 10 input images with mask support on the first image.',
    promptElements: [
      'Target area: What specific region is being edited',
      'Desired content: What should appear in the masked area',
      'Style matching: Specify style to maintain (pixel-art, photorealistic, cartoon)',
      'Lighting consistency: Match the original image lighting and shadows',
      'Texture matching: Ensure textures blend naturally with surroundings',
      'Perspective/scale: Match the original image perspective'
    ],
    tips: [
      // CORE INPAINTING TIPS
      'Be extremely specific about what should appear in the masked region',
      'Describe how the new content should match the existing image style',
      'Include lighting and shadow details for seamless integration',
      'Specify textures and materials that match the surrounding area',
      'Describe the perspective and scale to match the original image',

      // GPT IMAGE 1 SPECIFIC
      'GPT Image 1: Mask applies to first image in the array',
      'GPT Image 1: Can combine multiple images - "Combine X and Y to show..."',
      'GPT Image 1: Specify style explicitly: "still in pixel-art style"',
      'GPT Image 1: Material transfer: use reference image for texture',
      'GPT Image 1: Interior design: photo of room + furniture change prompts'
    ],
    examplePrompt: 'In the masked region, add a small potted succulent plant in a white ceramic pot. The plant should have the same soft, diffused lighting as the rest of the desk scene, with a subtle shadow cast to the right matching the existing light direction. The ceramic pot should have a matte finish that complements the minimalist aesthetic of the workspace. Maintain the photorealistic style of the original image.'
  },
  'reference': {
    context: 'Veo 3.1 Reference Images: Provide up to 3 asset images of a single person, character, or product. Veo preserves the subjects appearance in the output video. Duration is fixed to 8 seconds.',
    promptElements: [
      'Subject description: Describe the person/character/product from reference images in detail',
      'Action: What the subject is doing in the video',
      'Environment: The setting where the action takes place',
      'Camera work: Shot type and camera movement',
      'Style: Visual style and mood of the video'
    ],
    tips: [
      'Reference images guide the video content - Veo preserves subject appearance',
      'Describe each referenced element in your prompt (e.g., "wearing the pink dress from image 1")',
      'Combine multiple reference elements naturally (e.g., "woman from image 1 wearing dress from image 2")',
      'Include detailed descriptions of how reference elements appear in the scene',
      'Specify camera movements and composition',
      'Add audio cues for dialogue or sound effects'
    ],
    examplePrompt: 'The video opens with a medium, eye-level shot of a beautiful woman with dark hair and warm brown eyes. She wears a magnificent, high-fashion flamingo dress with layers of pink and fuchsia feathers, complemented by whimsical pink, heart-shaped sunglasses. She walks with serene confidence through crystal-clear, shallow turquoise water of a sun-drenched lagoon. The camera slowly pulls back to a medium-wide shot, revealing the breathtaking scene as the dress long train glides gracefully on the water surface. Cinematic, dreamlike atmosphere.'
  },
  'gemini-edit': {
    context: 'Gemini image editing (text-and-image-to-image). Provide an image and use text prompts to add, remove, or modify elements, change style, or adjust color grading. Model matches original style, lighting, and perspective.',
    promptElements: [
      'Subject identification: What is in the provided image',
      'Edit action: add/remove/modify specific elements',
      'Integration details: How the change should blend naturally',
      'Style preservation: Maintain original image aesthetics',
      'Lighting matching: Ensure edits match existing lighting'
    ],
    tips: [
      'Template: "Using the provided image of [subject], please [add/remove/modify] [element]. Ensure the change is [integration description]."',
      'Adding elements: Describe position, size, and how it fits the scene lighting',
      'Removing elements: Describe what should replace the removed area',
      'Style transfer: "Transform into the style of [artist/style]. Preserve composition but render with [stylistic elements]."',
      'Color grading: Specify the exact color adjustments and mood',
      'The model will automatically match lighting and perspective',
      'Gemini 2.5 Flash works best with up to 3 input images',
      'Gemini 3 Pro supports 5 images with high fidelity, up to 14 total'
    ],
    examplePrompt: 'Using the provided image of my cat, please add a small, knitted wizard hat on its head. Make it look like it is sitting comfortably and matches the soft lighting of the photo. The hat should cast a subtle shadow consistent with the existing light direction.'
  },
  'multi-turn': {
    context: 'Gemini iterative refinement: Conversationally refine your image over multiple turns, making small adjustments until perfect. Use follow-up prompts to adjust specific details.',
    promptElements: [
      'Current state: Reference what exists from previous turns',
      'Specific adjustment: One clear change to make',
      'Preservation: What to keep unchanged',
      'Detail level: How precise the change should be'
    ],
    tips: [
      'Dont expect perfection on first try - iterate conversationally',
      'Use follow-ups like: "Thats great, but can you make the lighting a bit warmer?"',
      'Keep instructions like: "Keep everything the same, but change the expression to be more serious"',
      'For complex scenes, use step-by-step: "First create [background], then add [foreground], finally place [focal element]"',
      'Reference previous results: "In the last image, adjust the..."',
      'Make one change at a time for best control',
      'Be specific about what to preserve vs what to change'
    ],
    examplePrompt: 'Keep the overall composition and lighting exactly as is. Only change the subjects expression from neutral to a warm, genuine smile with slight eye crinkles. The rest of the image should remain completely unchanged.'
  },
  'video-extend': {
    context: 'Veo 3.1 Extension: Extend Veo-generated videos by 7 seconds, up to 20 times (max 141 seconds total). Extension uses the final second (24 frames) as starting point and continues the action.',
    promptElements: [
      'Continuation: Describe what happens next in the scene',
      'Action progression: How the existing action continues or evolves',
      'New elements: Any new subjects or elements that appear',
      'Camera continuation: How camera movement should continue',
      'Audio: New dialogue, sounds, or music to add'
    ],
    tips: [
      'Extension finalizes the last 1 second (24 frames) and continues from there',
      'Voice/dialogue cannot be effectively extended if not present in last 1 second',
      'Describe what happens NEXT - the continuation of the existing video',
      'Maintain visual and narrative continuity with the original video',
      'Specify new actions, camera movements, or scene changes',
      'Input requirements: 16:9 or 9:16 aspect ratio, 720p resolution, max 141 seconds'
    ]
  },
  'frame-specific': {
    context: 'Veo 3.1 Frame Interpolation: Specify first AND last frames to control the shots composition. Define exactly how your scene begins and concludes. Veo generates the transition between them.',
    promptElements: [
      'Start state: Describe the first frame composition',
      'End state: Describe the last frame composition',
      'Transition: How the scene transforms between start and end',
      'Motion path: The journey or movement between frames',
      'Camera work: How the camera moves during the transition'
    ],
    tips: [
      'Upload images or use frames from previous generations as start/end points',
      'Describe the transformation journey between the two frames',
      'Include smooth transition details and motion paths',
      'Specify how subjects move from their starting position to ending position',
      'Add camera movement descriptions that connect both frames',
      'Include timing and pacing for the transition'
    ],
    examplePrompt: 'A smooth transition where the subject walks from the left side of frame toward the camera, the background gradually shifts from a forest setting to an urban environment, camera slowly dollies forward while tilting up slightly, lighting transitions from natural daylight to warm golden hour.'
  },
};

// ============================================================================
// Provider-Specific Optimizations
// ============================================================================

export const PROVIDER_OPTIMIZATIONS: Record<MediaProvider, any> = {
  openai: {
    imageGeneration: {
      strengths: [
        'GPT Image 1 (4o): Autoregressive model with world knowledge',
        'Excellent instruction-following for detailed prompts',
        'Photorealistic outputs with accurate text rendering',
        'Up to 10 reference images for guided generation',
        'Aspect ratios: 1:1 (1024x1024), 3:2 (1536x1024), 2:3 (1024x1536)',
        'Transparent PNG backgrounds supported',
        'Style transfer and "Ghiblify" style capabilities',
        'Multi-turn consistency within same chat'
      ],
      tips: [
        // CORE PRINCIPLES
        'BE SPECIFIC AND DETAILED: More specific = better quality',
        'Include setting, objects, colors, mood, and specific elements',
        'Use descriptive adjectives: "fluffy, small, brown dog" not just "a dog"',

        // COMPOSITION & CAMERA
        'Specify perspective: close-up, wide shot, birds-eye view, specific angle',
        'Define lighting, composition, and style for specific goals',
        'Specify camera/lens type for photo-like results',
        'Specify aspect ratio explicitly (model defaults to 1:1)',

        // STYLE & MOOD
        'Describe mood/atmosphere: "serene", "chaotic", "mystical", "futuristic"',
        'Use analogies: "in the style of Van Gogh", "resembling a fantasy novel scene"',
        'Specify styles/themes: "cyberpunk", "art deco", "minimalist"',

        // ADVANCED TECHNIQUES
        'Incorporate action/movement for dynamic images',
        'Specify lighting and time of day: candlelight, neon lights, golden hour',
        'Avoid overloading: balance descriptive with concise',
        'For transparent backgrounds: mention "transparent PNG" or "transparent background"',
        'For text in images: The model renders text well, include exact text needed',

        // ITERATION
        'Use iterative approach: refine prompts based on results',
        'Model remembers images in same chat - start fresh for independent tasks',
        'Use reasoning models (o3) for multi-step generation with consistent style',

        // PROMPT MAX LENGTH: 32000 characters for gpt-image-1.5
        'Max prompt length: 32000 characters (vs 4000 for DALL-E 3)'
      ],
    },
    imageEditing: {
      strengths: [
        'GPT Image 1 accepts up to 10 input images',
        'Mask support for preserving specific regions',
        'Combine multiple images into new compositions',
        'Style transfer from reference images',
        'Inpainting within same chat session'
      ],
      tips: [
        'Combine images: "Combine the images of X and Y to show..."',
        'Style transfer: Provide reference image and ask to apply its style',
        'Preserve regions with mask on first image in array',
        'Material transfer: Reference image for texture, apply to subject',
        'Interior design: Photo of room + prompt for furniture changes',
        'Be explicit about what to keep vs what to change',
        'Specify pixel-art, cartoon, or photorealistic style to maintain'
      ],
    },
    videoGeneration: {
      strengths: [
        'Sora: Cinematic quality with photorealistic physics',
        'Native audio generation: dialogue, sound effects, ambient sounds, music',
        'Professional cinematography with film-like quality',
        'Complex camera movements and choreography',
        'Extended durations with coherent motion',
        'Understands film terminology and techniques',
        'Diegetic sound design with LUFS mixing levels'
      ],
      tips: [
        // FORMAT & LOOK
        'Duration: Specify length (e.g., 4s)',
        'Shutter: 180° shutter for cinematic motion blur',
        'Capture style: Digital emulating 65mm photochemical contrast',
        'Grain: Fine grain texture for film-like quality',
        'Halation: Subtle halation on speculars',
        'Gate weave: Specify "no gate weave" for stability or add for vintage feel',

        // LENSES & FILTRATION
        'Lenses: 32mm / 50mm / 85mm spherical primes',
        'Filtration: Black Pro-Mist 1/4 for dreamy look',
        'CPL: Slight CPL rotation to manage glass reflections',

        // GRADE & PALETTE
        'Highlights: Clean morning sunlight with amber lift',
        'Mids: Balanced neutrals with slight teal cast in shadows',
        'Blacks: Soft, neutral with mild lift for haze retention',
        'LUT: Warm-cool split tone for morning palette',

        // LIGHTING & ATMOSPHERE
        'Light direction: "Natural sunlight from camera left, low angle (07:30 AM)"',
        'Bounce: 4×4 ultrabounce silver from trackside',
        'Negative fill: From opposite wall for contrast',
        'Practicals: Sodium platform lights on dim fade',
        'Atmosphere: Gentle mist, exhaust drift through light beam',

        // LOCATION & FRAMING
        'Foreground: Define objects (yellow safety line, coffee cup on bench)',
        'Midground: Waiting passengers silhouetted in haze',
        'Background: Arriving train braking to stop',
        'Avoid: Signage or corporate branding',

        // WARDROBE & PROPS
        'Main subject: "Mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side"',
        'Extras: Commuters in muted tones; one cyclist pushing bike',
        'Props: Paper coffee cup, rolling luggage, LED departure board (generic destinations)',

        // SOUND (NATIVE AUDIO)
        'Diegetic only: Faint rail screech, train brakes hiss, distant announcement muffled (-20 LUFS)',
        'Ambient: Low ambient hum, footsteps, paper rustle',
        'No score: Specify "no score or added foley" for realism',
        'Dialogue: Put spoken words in "quotes" with voice tone',
        'Music mood: Upbeat, orchestral, minimal, emotional (if needed)',

        // SHOT LIST FORMAT
        'Shot format: "0.00–2.40 — Shot Name (lens, camera movement)"',
        'Example: "0.00–2.40 — Arrival Drift (32mm, shoulder-mounted slow dolly left)"',
        'Include purpose: "Purpose: establish setting and tone, hint anticipation"',
        'Example: "2.40–4.00 — Turn and Pause (50mm, slow arc in) - traveler turns toward camera, catching sunlight rim"',

        // CAMERA NOTES
        'Eyeline: Keep low and close to lens axis for intimacy',
        'Flares: Allow micro flares from glass as aesthetic texture',
        'Handheld: Preserve subtle handheld imperfection for realism',
        'Silhouettes: Do not break silhouette clarity with overexposed flare',
        'Skin: Retain skin highlight roll-off',

        // FINISHING
        'Grain overlay: Fine-grain with mild chroma noise for realism',
        'Halation: Restrained halation on practicals',
        'LUT: Warm-cool LUT for morning split tone',
        'Mix priority: Prioritize train and ambient detail over footstep transients',
        'Poster frame: "Traveler mid-turn, golden rim light, arriving train soft-focus in background haze"'
      ],
    },
  },
  google: {
    imageGeneration: {
      strengths: [
        'Gemini 3 Pro: Up to 4K resolution (1K, 2K, 4K)',
        'Up to 14 reference images for guided generation',
        'Google Search grounding for real-time data imagery',
        'Advanced text rendering for logos, infographics, menus',
        'Thinking mode for complex prompts',
        'High-fidelity text rendering',
        'Iterative multi-turn refinement'
      ],
      tips: [
        'CORE PRINCIPLE: Describe the scene narratively, dont just list keywords',
        'Be hyper-specific: Describe details like "ornate elven plate armor, etched with silver leaf patterns"',
        'Provide context and intent: Explain purpose of the image',
        'Use photographic terms: camera angles, lens types (85mm portrait, wide-angle), lighting setups',
        'For text in images: First generate text content, then ask for image with that text',
        'Use semantic negative prompts: Describe desired scene positively instead of saying "no X"',
        'Control composition: wide-angle shot, macro shot, low-angle perspective',
        'Iterate conversationally: Follow up with "make the lighting warmer" or "change expression to serious"',
        'For complex scenes: Use step-by-step instructions',
        'Template: "[Shot type] of [subject], [action], set in [environment]. Illuminated by [lighting], creating [mood]. Captured with [camera details]."'
      ],
    },
    imageEditing: {
      strengths: [
        'Add, remove, or modify elements seamlessly',
        'Style transfer and color grading',
        'Automatic lighting and perspective matching',
        'Multi-turn conversational refinement'
      ],
      tips: [
        'Template: "Using the provided image of [subject], please [add/remove/modify] [element]. Ensure [integration details]."',
        'For adding: Describe position, size, lighting match, shadow direction',
        'For removing: Describe what should fill the removed area',
        'For style transfer: "Transform into style of [artist]. Preserve composition, render with [style elements]."',
        'Model automatically matches original style, lighting, and perspective',
        'Iterate: "Keep everything, but change [specific detail]"'
      ],
    },
    videoGeneration: {
      strengths: [
        'Veo 3.1: Native audio with dialogue, sound effects, ambient noise',
        'High-fidelity video up to 1080p resolution',
        'Duration options: 4, 6, or 8 seconds',
        'Reference images: Up to 3 images to guide content',
        'Frame interpolation: First and last frame control',
        'Video extension: Add 7 seconds up to 20 times'
      ],
      tips: [
        'Subject: Specify the object, person, animal, or scenery clearly',
        'Action: Describe what the subject is doing (walking, running, turning)',
        'Style: Use film style keywords (sci-fi, horror film, film noir, cartoon)',
        'Camera: Use terms like aerial view, eye-level, dolly shot, tracking',
        'Composition: Specify wide shot, close-up, single-shot, two-shot',
        'Focus: Include shallow focus, deep focus, macro lens, wide-angle',
        'Ambiance: Describe color and light (blue tones, golden hour, warm)',
        'Audio: Use quotes for dialogue, describe sound effects explicitly',
        'Negative prompts: Describe unwanted elements without using "no" or "dont"'
      ],
    },
  },
};

// ============================================================================
// System Prompt Template
// ============================================================================

export function getPromptImprovementSystemPrompt(
  mediaType: MediaType,
  mediaSubType?: MediaSubType,
  provider?: MediaProvider,
  model?: string
): string {
  const guidelines = MEDIA_TYPE_GUIDELINES[mediaType];
  const providerInfo = provider ? PROVIDER_OPTIMIZATIONS[provider] : null;
  const subtypeInfo = mediaSubType ? SUBTYPE_GUIDELINES[mediaSubType] : null;

  // Convert mediaType to camelCase key for provider lookup (e.g., 'image-generation' -> 'imageGeneration')
  const mediaTypeKey = mediaType.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  const providerContext = providerInfo
    ? `\n\nPROVIDER: ${provider?.toUpperCase()}
${model ? `Model: ${model}` : ''}
Provider strengths: ${JSON.stringify(providerInfo[mediaTypeKey]?.strengths || [])}
Optimization tips: ${JSON.stringify(providerInfo[mediaTypeKey]?.tips || [])}`
    : '';

  const subtypeContext = subtypeInfo
    ? `\n\nSPECIFIC MODE: ${mediaSubType?.replace(/-/g, ' ').toUpperCase()}
Context: ${subtypeInfo.context}
${subtypeInfo.promptElements ? `\nPROMPT ELEMENTS TO INCLUDE:\n${subtypeInfo.promptElements.map(el => `- ${el}`).join('\n')}` : ''}
${subtypeInfo.tips ? `\nMODE-SPECIFIC TIPS:\n${subtypeInfo.tips.map(tip => `- ${tip}`).join('\n')}` : ''}
${subtypeInfo.examplePrompt ? `\nEXAMPLE OF EXCELLENT PROMPT:\n"${subtypeInfo.examplePrompt}"` : ''}`
    : '';

  return `You are a world-class AI prompt engineer specializing in ${mediaType.replace('-', ' ')}.
Your expertise includes ${guidelines.examples}.

Your task is to transform basic user prompts into professional, detailed, production-ready prompts that will produce stunning ${mediaType.includes('image') ? 'visuals' : 'videos'}.

FOCUS AREAS:
${guidelines.focusAreas.map((area, i) => `${i + 1}. ${area}`).join('\n')}

TECHNICAL VOCABULARY TO INCORPORATE:
${guidelines.technicalTerms.map(term => `- ${term}`).join('\n')}

STYLE GUIDANCE:
${guidelines.styleGuidance.map(style => `- ${style}`).join('\n')}${providerContext}${subtypeContext}

QUALITY STANDARDS:
- Vivid, specific, production-ready descriptions
- Professional terminology and technical accuracy
- Clear visual or cinematic language optimized for AI generation
- Aim for ${guidelines.maxLength} chars max

<solution_persistence>
You are an autonomous prompt engineer. Execute immediately without asking questions or seeking confirmation.
- Be extremely biased for action - make sensible assumptions about missing details and proceed
- Never ask clarifying questions - infer intent and deliver the improved prompt
- Never explain what you did or why - just output the result
- Never output meta-commentary like "here's your prompt" or "I've improved this by..."
</solution_persistence>

<output_format>
Write prompts as DIRECT SCENE DESCRIPTIONS - what the AI will render, NOT instructions to the AI.

FORBIDDEN PATTERNS (never use):
- "Create...", "Generate...", "Make...", "Produce..."
- "I want you to...", "Please...", "Can you..."
- "This should be...", "It needs to..."
- Questions of any kind

REQUIRED PATTERN:
- Direct descriptive language: "A woman walking...", "Urban street at dawn...", "Professional product shot of..."
- For video: Structured sections (Format, Lenses, Grade, Lighting, Location, Subject, Sound, Shot breakdown)
- For images: Flowing description with composition, lighting, lens, colors, mood, aspect ratio
</output_format>

CORE RULES:
1. Preserve the user's core concept and intent
2. Transform ANY input format into direct descriptive output
3. Use industry-standard terminology for the target platform
4. Be specific: lighting, camera, colors, mood, composition, sound (video)
5. Natural, readable prose or structured sections - no bullet lists in final prompt

OUTPUT: Return ONLY the improved prompt text. No JSON, no explanations, no meta-commentary.`;
}

// ============================================================================
// User Prompt Template
// ============================================================================

/**
 * Build simple user prompt - just the original prompt and instructions
 * All examples and rules are already in system prompt
 */
export function getPromptImprovementUserPrompt(
  originalPrompt: string,
  _mediaType: MediaType,
  _mediaSubType?: MediaSubType,
  userInstructions?: string
): string {
  if (userInstructions) {
    return `${originalPrompt}\n\nEnhance with: ${userInstructions}`;
  }

  return originalPrompt;
}
