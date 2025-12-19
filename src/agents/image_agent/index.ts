/**
 * Image Agent - Main Export
 * Central export point for all image generation functionality
 */

// Services (Main agent service)
export { imageGenerationService } from './services/imageGeneration.service';

// Responses API service (conversational image generation)
export { responsesImageGenerationService } from './services/responsesImageGeneration.service';

// Alias for consistency with other agents
export { imageGenerationService as imageAgent } from './services/imageGeneration.service';

// Types
export * from './types/imageGeneration.types';

// Schemas
export * from './schemas/imageGeneration.schema';

// Prompts
export * from './prompts/imageGeneration.prompts';

// Components
export { ImageGenerationPanel } from './components/ImageGenerationPanel';
export { ImageProgressIndicator } from './components/ImageProgressIndicator';

// Re-export commonly used items
export { imageGenerationPresets } from './types/imageGeneration.types';
export type {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageGenerationPreset,
  StreamingProgressEvent,
} from './types/imageGeneration.types';
