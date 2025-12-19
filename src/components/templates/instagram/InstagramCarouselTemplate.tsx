/**
 * Instagram Carousel Template
 * Multi-image/video post (2-10 items, 1:1 ratio each)
 * Supports both images and videos in carousel
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, Play } from 'lucide-react'

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

export function InstagramCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)
  
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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % displayItems.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + displayItems.length) % displayItems.length)
  }

  const currentItem = displayItems[currentSlide]
  const isCurrentVideo = currentItem?.type === 'video'

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden max-w-xl mx-auto ${className}`}>
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-full p-[2px]">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-pink-600 rounded-full" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm text-black">Your Account</p>
            <p className="text-xs text-gray-500">Location</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full aspect-square bg-black">
        {displayItems.length > 0 ? (
          <>
            {/* Render video or image based on current item type */}
            {isCurrentVideo ? (
              <video
                key={currentSlide}
                src={currentItem?.url}
                className="w-full h-full object-contain bg-black"
                controls
                playsInline
              />
            ) : (
              <img
                src={currentItem?.url}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Navigation Arrows */}
            {displayItems.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition shadow-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide Counter */}
            <div className="absolute top-3 right-3 bg-gray-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium">
              {currentSlide + 1}/{displayItems.length}
            </div>

            {/* Carousel Dots */}
            {displayItems.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {displayItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide ? 'bg-[#0095F6] w-2' : 'bg-white/60 w-2 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Media type badge */}
            <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
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

      {/* Actions */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-4">
            <button className="text-gray-700 hover:text-red-600 transition">
              <Heart className="w-6 h-6" />
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button className="text-gray-700 hover:text-gray-900 transition">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm font-semibold">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <div className="text-sm">
          <span className="font-semibold">Your Account </span>
          <span className="text-gray-800 break-words">
            {content.length > 2200 ? content.substring(0, 2197) + '...' : content}
          </span>
        </div>

        <button className="text-xs text-gray-500 mt-2 hover:text-gray-700">
          View all 45 comments
        </button>

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

export default InstagramCarouselTemplate
