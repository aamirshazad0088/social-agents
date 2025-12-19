/**
 * Facebook Carousel Template
 * Multiple images/videos in carousel format
 * Supports both images and videos
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, Smile, ChevronLeft, ChevronRight, Play } from 'lucide-react'

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

export function FacebookCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
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
      {/* Facebook Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-600" />
            <div>
              <p className="font-bold text-sm text-black">Your Page</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <button className="text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Text */}
      <div className="p-4">
        <p className="text-sm text-black break-words mb-3">
          {content.length > 63206 ? content.substring(0, 63203) + '...' : content}
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
                      idx === currentIndex ? 'bg-[#1877F2] w-2' : 'bg-white/60 w-2 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Media type badge */}
            <div className="absolute top-3 left-3 bg-[#1877F2] text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
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

      {/* Engagement Stats */}
      <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
        <div className="flex justify-between">
          <span>❤️ 234 👍 567 😮 89</span>
          <span>123 comments • 45 shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-around py-2 border-t border-gray-200">
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <Heart className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Comment Section */}
      {mode !== 'published' && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <Smile className="w-6 h-6 text-gray-600 cursor-pointer hover:text-blue-600" />
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm outline-none hover:bg-gray-200 focus:bg-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FacebookCarouselTemplate
