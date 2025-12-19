/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // OPTIMIZATION: Use modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
  },

  // OPTIMIZATION: Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'react-hot-toast'],
    // Increase body size limit for video uploads (500MB)
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // LangChain packages need to be external for dynamic imports
    serverComponentsExternalPackages: [
      'langchain',
      '@langchain/core',
      '@langchain/openai',
      '@langchain/anthropic',
      '@langchain/google-genai',
      '@langchain/groq',
      '@langchain/deepseek',
      'fluent-ffmpeg',
      'ffmpeg-static',
      'ffprobe-static',
    ],
  },

  // OPTIMIZATION: Remove console logs in production and enable optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },

  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
};

export default nextConfig;
