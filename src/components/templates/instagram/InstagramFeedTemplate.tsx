/**
 * Instagram Feed Template
 * Single image post or carousel (1:1 ratio, 480x480px max)
 * Displays like the actual Instagram feed post with carousel support
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { PlatformTemplateProps } from '../types'

export function InstagramFeedTemplate({ 
  post, 
  content, 
  media, 
  mode, 
  className = '',
  title,
  hashtags = [],
  contentType,
  contentFormat
}: PlatformTemplateProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [mediaLoading, setMediaLoading] = useState(true)
  
  // Get all media (images and videos)
  const allMedia: MediaAsset[] = []
  
  // Add images from media array
  media.filter((m) => m.type === 'image').forEach(img => {
    if (!allMedia.find(m => m.url === img.url)) {
      allMedia.push(img)
    }
  })
  
  // Add videos from media array
  media.filter((m) => m.type === 'video').forEach(vid => {
    if (!allMedia.find(m => m.url === vid.url)) {
      allMedia.push(vid)
    }
  })
  
  // Add generated image if not already in list
  if (post.generatedImage && !allMedia.find(m => m.url === post.generatedImage)) {
    allMedia.push({
      id: 'generated-image',
      name: 'Generated Image',
      type: 'image',
      url: post.generatedImage,
      size: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      source: 'ai-generated',
      usedInPosts: [post.id]
    })
  }
  
  // Add generated video if not already in list
  if (post.generatedVideoUrl && !allMedia.find(m => m.url === post.generatedVideoUrl)) {
    allMedia.push({
      id: 'generated-video',
      name: 'Generated Video',
      type: 'video',
      url: post.generatedVideoUrl,
      size: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      source: 'ai-generated',
      usedInPosts: [post.id]
    })
  }

  const hasMultipleMedia = allMedia.length > 1
  const currentMedia = allMedia[currentMediaIndex]
  const isVideo = currentMedia?.type === 'video'

  const nextMedia = () => {
    setMediaLoading(true)
    setCurrentMediaIndex((prev: number) => (prev + 1) % allMedia.length)
  }

  const prevMedia = () => {
    setMediaLoading(true)
    setCurrentMediaIndex((prev: number) => (prev - 1 + allMedia.length) % allMedia.length)
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden max-w-xl mx-auto ${className}`}>
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-0.5">
            <div className="w-full h-full bg-white rounded-full" />
          </div>
          <div>
            <p className="font-semibold text-sm">your_account</p>
            {mode === 'published' && <p className="text-xs text-gray-500">Sponsored</p>}
          </div>
        </div>
        <button className="text-gray-900 hover:text-gray-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Media Carousel (Images and Videos) */}
      <div className="w-full aspect-square bg-black relative overflow-hidden">
        {mediaLoading && <LoadingSkeleton type="image" className="absolute inset-0" />}
        {currentMedia ? (
          <>
            {isVideo ? (
              <video
                src={currentMedia.url}
                className={`w-full h-full object-contain transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
                controls
                playsInline
                onLoadedData={() => setMediaLoading(false)}
              />
            ) : (
              <img
                src={currentMedia.url}
                alt="Post content"
                className={`w-full h-full object-contain transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setMediaLoading(false)}
              />
            )}
            
            {/* Carousel Navigation */}
            {hasMultipleMedia && (
              <>
                <button
                  onClick={prevMedia}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextMedia}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Carousel Dots */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allMedia.map((_: MediaAsset, idx: number) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentMediaIndex ? 'bg-blue-500 w-2 h-2' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <p className="text-gray-400">No media</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-4">
            <button className="hover:opacity-60 transition">
              <Heart className="w-7 h-7" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition">
              <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition">
              <Send className="w-7 h-7" strokeWidth={1.5} />
            </button>
          </div>
          <button className="hover:opacity-60 transition">
            <Bookmark className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Likes count */}
        <p className="text-sm font-semibold mb-1">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <div className="text-sm">
          <span className="font-semibold">your_account </span>
          <span className="text-gray-800 break-words whitespace-pre-wrap">
            {title && <span className="font-semibold">{title}<br/></span>}
            {content.length > 2200 ? content.substring(0, 2197) + '...' : content}
            {hashtags.length > 0 && (
              <span className="text-blue-900 block mt-1">
                {hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
              </span>
            )}
          </span>
        </div>

        {/* Comments count */}
        <button className="text-xs text-gray-500 mt-2 hover:text-gray-700">
          View all 45 comments
        </button>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-2">2 HOURS AGO</p>
      </div>

      {/* Add comment */}
      {mode !== 'published' && (
        <div className="border-t px-4 py-3 flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-transparent placeholder-gray-500 outline-none"
          />
          <button className="text-blue-500 font-semibold text-sm hover:text-blue-600">Post</button>
        </div>
      )}
    </div>
  )
}

export default InstagramFeedTemplate
