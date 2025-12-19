/**
 * Video Agent - Main Export
 * Central export point for all video agent functionality
 */

// Services (Sub-agents) - OpenAI Sora
export { generateVideo } from './services/generation.service';
export { checkVideoStatus } from './services/status.service';
export { downloadVideo } from './services/download.service';
export { generateImageToVideo, generateVideoWithReferences } from './services/imageToVideo.service';

// Services - Google Veo 3.1
export { generateVeoVideo } from './services/veo.generation.service';
export { generateVeoImageToVideo, prepareImageForUpload } from './services/veo.imageToVideo.service';
export { extendVeoVideo, calculateTotalDuration, canExtendVideo } from './services/veo.extension.service';
export { generateVeoFrameSpecific } from './services/veo.frameSpecific.service';
export { generateVeoWithReferenceImages } from './services/veo.referenceImages.service';
export { checkVeoOperationStatus, pollVeoOperationUntilDone } from './services/veo.status.service';
export { downloadVeoVideo, downloadVeoVideoAsDataUrl, getVeoVideoUrl } from './services/veo.download.service';

// Types - OpenAI Sora
export * from './types/video.types';

// Types - Google Veo 3.1
export * from './types/veo.types';

// Schemas
export * from './schemas/video.schemas';
