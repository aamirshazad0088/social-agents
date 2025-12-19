/**
 * Twitter/X Carousel Template
 * Multi-image/video post with carousel navigation
 * Supports up to 4 images or 1 video
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Repeat2, Share, ChevronLeft, ChevronRight, Play } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
  title?: string
  hashtags?: string[]
}

// Helper to detect if URL is a video
const isVideoUrl = (url: string): boolean => {
  return !!(url?.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i) || 
           url?.includes('video') ||
           url?.startsWith('data:video/'));
};

export function TwitterCarouselTemplate({ post, content, media, mode, className = '', title, hashtags = [] }: Props) {
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

  // Combine content with hashtags
  const fullContent = hashtags.length > 0 
    ? `${content}\n\n${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`
    : content;
    
  // Character count
  const charCount = fullContent.length
  const maxChars = 280

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-lg w-full max-w-[550px] mx-auto ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start p-4 pb-2">
        <div className="flex gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-bold text-black text-[15px]">Your Account</p>
              <svg className="w-4 h-4 text-[#1D9BF0]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">@youraccount · now</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-blue-400 transition p-1">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {title && (
          <p className="font-bold text-black text-lg mb-2">
            {title}
          </p>
        )}
        <p className="text-black text-[15px] break-words whitespace-pre-wrap leading-relaxed">
          {charCount > maxChars ? fullContent.substring(0, maxChars - 3) + '...' : fullContent}
        </p>
      </div>

      {/* Carousel Container */}
      {displayItems.length > 0 && (
        <div className="relative mx-4 mb-3 rounded-2xl overflow-hidden bg-black">
          <div className="aspect-video relative">
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
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide Counter */}
            {displayItems.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                {currentSlide + 1}/{displayItems.length}
              </div>
            )}

            {/* Media type badge */}
            {(displayItems.length > 1 || isCurrentVideo) && (
              <div className="absolute top-2 left-2 bg-[#1D9BF0] text-white px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1">
                {isCurrentVideo ? <Play className="w-3 h-3" /> : null}
                {displayItems.length > 1 ? 'CAROUSEL' : 'VIDEO'}
              </div>
            )}
          </div>

          {/* Thumbnail dots */}
          {displayItems.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {displayItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Character Counter */}
      {mode !== 'published' && (
        <div className="px-4 mb-2 text-xs text-gray-500">
          {charCount}/{maxChars} characters {charCount > maxChars && '❌'}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="mx-4 mb-2 text-xs text-gray-500 flex gap-4 pb-2 border-b border-gray-100">
        <span>234 Replies</span>
        <span>567 Reposts</span>
        <span>1.2K Likes</span>
      </div>

      {/* Actions */}
      <div className="flex justify-around py-2 px-4 text-gray-500">
        <button className="flex items-center gap-1 group hover:text-[#1D9BF0] transition p-2 rounded-full hover:bg-blue-50">
          <MessageCircle className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-1 group hover:text-green-500 transition p-2 rounded-full hover:bg-green-50">
          <Repeat2 className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-1 group hover:text-pink-500 transition p-2 rounded-full hover:bg-pink-50">
          <Heart className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-1 group hover:text-[#1D9BF0] transition p-2 rounded-full hover:bg-blue-50">
          <Share className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default TwitterCarouselTemplate
