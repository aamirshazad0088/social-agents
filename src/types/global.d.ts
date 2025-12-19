export { }

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>
      openSelectKey: () => Promise<void>
    }
  }
}

declare module 'ffmpeg-static';
declare module 'ffprobe-static';

