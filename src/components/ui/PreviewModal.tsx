'use client'

import React, { useState, useEffect } from 'react';
import { Post, Platform, MediaAsset } from '@/types';
import { PLATFORMS } from '@/constants';
import { X } from 'lucide-react';
import { PlatformTemplateRenderer } from '@/components/templates/PlatformTemplateRenderer';

interface PreviewModalProps {
    post: Post;
    onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ post, onClose }) => {
    const [activePlatform, setActivePlatform] = useState<Platform>(post.platforms[0] ?? 'twitter');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Helper to detect if URL is a video
    const isVideoUrl = (url: string): boolean => {
        return !!(url?.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i) || 
                 url?.includes('video') ||
                 url?.startsWith('data:video/'));
    };

    const PlatformPreview: React.FC<{ platform: Platform }> = ({ platform }) => {
        // Build media array from post properties
        const media: MediaAsset[] = [];
        
        // Add carousel images/videos if available
        if (post.carouselImages && post.carouselImages.length > 0) {
            post.carouselImages.forEach((url, index) => {
                const isVideo = isVideoUrl(url);
                media.push({
                    id: `carousel-${index}-${Date.now()}`,
                    name: `Carousel Slide ${index + 1}`,
                    type: isVideo ? 'video' as const : 'image' as const,
                    url: url,
                    size: 0,
                    tags: ['carousel'],
                    createdAt: new Date().toISOString(),
                    source: 'ai-generated' as const,
                    usedInPosts: [post.id]
                });
            });
        } else if (post.generatedImage) {
            // Fallback to single image if no carousel
            media.push({
                id: `image-${Date.now()}`,
                name: 'Generated Image',
                type: 'image' as const,
                url: post.generatedImage,
                size: 0,
                tags: [],
                createdAt: new Date().toISOString(),
                source: 'ai-generated' as const,
                usedInPosts: [post.id]
            });
        }
        
        if (post.generatedVideoUrl) {
            media.push({
                id: `video-${Date.now()}`,
                name: 'Generated Video',
                type: 'video' as const,
                url: post.generatedVideoUrl,
                size: 0,
                tags: [],
                createdAt: new Date().toISOString(),
                source: 'ai-generated' as const,
                usedInPosts: [post.id]
            });
        }

        // Get content for the platform
        const rawContent = post.content?.[platform] || '';
        const content = typeof rawContent === 'string'
            ? rawContent
            : typeof rawContent === 'object'
            ? (rawContent as any)?.description || ''
            : '';

        return (
            <div className="flex justify-center w-full">
                <PlatformTemplateRenderer
                    post={post}
                    platform={platform}
                    postType={post.postType || 'post'}
                    media={media}
                    mode="preview"
                    className="font-serif"
                />
            </div>
        );
    };


    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 animate-fade-in" onClick={onClose}>
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide scroll-smooth" onClick={e => e.stopPropagation()}>
                <PlatformPreview platform={activePlatform} />
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default PreviewModal;
