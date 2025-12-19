/**
 * LinkedIn Carousel Template
 * Document carousel or multi-image carousel
 * Matches the authentic LinkedIn carousel post design
 * Supports both images and videos in carousel
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Repeat2, Send, MoreHorizontal, ChevronLeft, ChevronRight, Play } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

// Helper to detect if URL is a video
const isVideoUrl = (url: string): boolean => {
  return !!(url?.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i) || 
           url?.includes('video') ||
           url?.startsWith('data:video/'));
};

export function LinkedInCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Support carouselImages array from post (can include videos)
  const carouselUrls = post.carouselImages && post.carouselImages.length > 0 
    ? post.carouselImages.map(url => ({ url, type: isVideoUrl(url) ? 'video' : 'image' }))
    : []
  
  // Build display items from media or carouselUrls
  const displayItems = carouselUrls.length > 0 
    ? carouselUrls 
    : media.length > 0 
      ? media.map(m => ({ url: m.url, type: m.type }))
      : post.generatedVideoUrl
        ? [{ url: post.generatedVideoUrl, type: 'video' }]
        : post.generatedImage 
          ? [{ url: post.generatedImage, type: 'image' }] 
          : []

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % displayItems.length)
  }

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length)
  }

  const currentItem = displayItems[currentIndex]
  const isCurrentVideo = currentItem?.type === 'video'

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden max-w-xl mx-auto ${className}`}>
      {/* LinkedIn Header */}
      <div className="p-3 flex justify-between items-start">
        <div className="flex gap-2">
          <div className="w-12 h-12 rounded-full bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">Y</span>
          </div>
          <div className="flex flex-col">
            <p className="font-semibold text-sm text-gray-900 hover:text-[#0A66C2] hover:underline cursor-pointer">Your Name</p>
            <p className="text-xs text-gray-500">Your Title • 1st</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              5 hours ago • <span className="text-[#0A66C2]">🌐</span>
            </p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 break-words whitespace-pre-wrap leading-relaxed">
          {content.length > 3000 ? content.substring(0, 2997) + '...' : content || 'testing'}
        </p>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full aspect-square bg-black">
        {displayItems.length > 0 ? (
          <>
            {/* Render video or image based on current item type */}
            {isCurrentVideo ? (
              <video
                key={currentIndex}
                src={currentItem?.url}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
              />
            ) : (
              <img
                src={currentItem?.url}
                alt={`Slide ${currentIndex + 1}`}
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Navigation Arrows */}
            {displayItems.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide Counter */}
            <div className="absolute top-3 right-3 bg-gray-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium">
              {currentIndex + 1}/{displayItems.length}
            </div>

            {/* Carousel Dots */}
            {displayItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {displayItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-[#0A66C2] w-2' : 'bg-white/60 w-2 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Media type badge */}
            <div className="absolute top-3 left-3 bg-[#0A66C2] text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              {isCurrentVideo ? <Play className="w-3 h-3" /> : null}
              {displayItems.length > 1 ? 'CAROUSEL' : isCurrentVideo ? 'VIDEO' : 'POST'}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500 text-sm">No media</p>
          </div>
        )}
      </div>

      {/* Reaction Summary */}
      <div className="px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="flex -space-x-1">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px]">👍</span>
            <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px]">❤️</span>
            <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px]">🎉</span>
          </span>
          <span className="ml-1 text-gray-600">234 likes</span>
        </div>
        <span className="text-gray-500">45 comments • 12 reposts</span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-200" />

      {/* Action Buttons */}
      <div className="flex justify-around py-1">
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-1 py-3 justify-center hover:bg-gray-100 rounded transition font-medium">
          <Heart className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-1 py-3 justify-center hover:bg-gray-100 rounded transition font-medium">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-1 py-3 justify-center hover:bg-gray-100 rounded transition font-medium">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 flex-1 py-3 justify-center hover:bg-gray-100 rounded transition font-medium">
          <Send className="w-5 h-5" />
          <span className="text-sm">Send</span>
        </button>
      </div>

      {/* Comment Section */}
      {mode !== 'published' && (
        <div className="p-3 border-t border-gray-200 flex gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none border border-gray-200 hover:bg-gray-50 focus:bg-white focus:border-gray-400 transition"
          />
        </div>
      )}
    </div>
  )
}

export default LinkedInCarouselTemplate
