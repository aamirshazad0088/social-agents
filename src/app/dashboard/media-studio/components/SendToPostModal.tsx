'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Send,
  Image as ImageIcon,
  Video,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Layers,
  FileText,
  Film,
  BookImage,
  Loader2,
  Check,
  ArrowRight,
  Rocket,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface MediaToSend {
  type: 'image' | 'video' | 'audio';
  url: string;
  prompt: string;
  additionalUrls?: string[]; // For carousel
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  postTypes: PostType[];
  color: string;
}

interface PostType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  supportsImage: boolean;
  supportsVideo: boolean;
  supportsCarousel: boolean;
}

interface SendToPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaToSend | null;
  onSend: (config: SendConfig) => Promise<void>;
}

export interface SendConfig {
  platform: string;
  postType: string;
  media: MediaToSend;
  postToPage?: boolean; // For LinkedIn: true = Company Page, false = Personal Profile
}

// LinkedIn account info from credentials status
interface LinkedInAccountInfo {
  organizationId?: string;
  organizationName?: string;
  profileName?: string;
  postToPage?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const PLATFORMS: Platform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram className="w-5 h-5" />,
    color: 'from-pink-500 to-purple-600',
    postTypes: [
      { id: 'post', name: 'Feed Post', icon: <ImageIcon className="w-4 h-4" />, description: 'Single image post', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'carousel', name: 'Carousel', icon: <Layers className="w-4 h-4" />, description: 'Multiple images/videos', supportsImage: true, supportsVideo: true, supportsCarousel: true },
      { id: 'story', name: 'Story', icon: <BookImage className="w-4 h-4" />, description: '24hr temporary post', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'reel', name: 'Reel', icon: <Film className="w-4 h-4" />, description: 'Short-form video', supportsImage: false, supportsVideo: true, supportsCarousel: false },
    ],
  },
  {
    id: 'twitter',
    name: 'Twitter/X',
    icon: <Twitter className="w-5 h-5" />,
    color: 'from-blue-400 to-blue-600',
    postTypes: [
      { id: 'post', name: 'Tweet', icon: <FileText className="w-4 h-4" />, description: 'Standard tweet', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'carousel', name: 'Carousel', icon: <Layers className="w-4 h-4" />, description: 'Multi-media tweet', supportsImage: true, supportsVideo: true, supportsCarousel: true },
      { id: 'thread', name: 'Thread', icon: <Layers className="w-4 h-4" />, description: 'Connected tweets', supportsImage: true, supportsVideo: true, supportsCarousel: true },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="w-5 h-5" />,
    color: 'from-blue-600 to-blue-800',
    postTypes: [
      { id: 'post', name: 'Post', icon: <ImageIcon className="w-4 h-4" />, description: 'Feed post', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'carousel', name: 'Carousel', icon: <Layers className="w-4 h-4" />, description: 'Multi-media post', supportsImage: true, supportsVideo: true, supportsCarousel: true },
      { id: 'story', name: 'Story', icon: <BookImage className="w-4 h-4" />, description: '24hr story', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'reel', name: 'Reel', icon: <Film className="w-4 h-4" />, description: 'Short video', supportsImage: false, supportsVideo: true, supportsCarousel: false },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="w-5 h-5" />,
    color: 'from-blue-700 to-blue-900',
    postTypes: [
      { id: 'post', name: 'Post', icon: <FileText className="w-4 h-4" />, description: 'Professional post', supportsImage: true, supportsVideo: true, supportsCarousel: false },
      { id: 'carousel', name: 'Carousel', icon: <Layers className="w-4 h-4" />, description: 'Multi-image post (2-20)', supportsImage: true, supportsVideo: true, supportsCarousel: true },
      { id: 'article', name: 'Article', icon: <BookImage className="w-4 h-4" />, description: 'Long-form content', supportsImage: true, supportsVideo: false, supportsCarousel: false },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <Youtube className="w-5 h-5" />,
    color: 'from-red-500 to-red-700',
    postTypes: [
      { id: 'short', name: 'Short', icon: <Film className="w-4 h-4" />, description: 'Vertical video', supportsImage: false, supportsVideo: true, supportsCarousel: false },
      { id: 'video', name: 'Video', icon: <Video className="w-4 h-4" />, description: 'Full video', supportsImage: false, supportsVideo: true, supportsCarousel: false },
      { id: 'thumbnail', name: 'Thumbnail', icon: <ImageIcon className="w-4 h-4" />, description: 'Video thumbnail', supportsImage: true, supportsVideo: false, supportsCarousel: false },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <Film className="w-5 h-5" />,
    color: 'from-gray-900 to-pink-600',
    postTypes: [
      { id: 'video', name: 'Video', icon: <Video className="w-4 h-4" />, description: 'TikTok video', supportsImage: false, supportsVideo: true, supportsCarousel: false },
      { id: 'slideshow', name: 'Slideshow', icon: <Layers className="w-4 h-4" />, description: 'Photo slideshow', supportsImage: true, supportsVideo: false, supportsCarousel: true },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

export function SendToPostModal({ isOpen, onClose, media, onSend }: SendToPostModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 3 for LinkedIn target selection

  // LinkedIn-specific state
  const [linkedInPostToPage, setLinkedInPostToPage] = useState<boolean | null>(null);
  const [linkedInInfo, setLinkedInInfo] = useState<LinkedInAccountInfo | null>(null);
  const [loadingLinkedInInfo, setLoadingLinkedInInfo] = useState(false);

  // Fetch LinkedIn account info when LinkedIn is selected
  useEffect(() => {
    if (selectedPlatform === 'linkedin' && !linkedInInfo) {
      setLoadingLinkedInInfo(true);
      fetch('/api/credentials/status')
        .then(res => res.json())
        .then(data => {
          if (data.linkedin) {
            setLinkedInInfo({
              organizationId: data.linkedin.organizationId,
              organizationName: data.linkedin.organizationName,
              profileName: data.linkedin.profileName || data.linkedin.username,
              postToPage: data.linkedin.postToPage,
            });
            // Default to saved preference
            if (linkedInPostToPage === null) {
              setLinkedInPostToPage(data.linkedin.postToPage ?? false);
            }
          }
        })
        .catch(() => { })
        .finally(() => setLoadingLinkedInInfo(false));
    }
  }, [selectedPlatform, linkedInInfo, linkedInPostToPage]);

  // Check if this is a carousel (has additionalUrls)
  const isCarousel = media?.additionalUrls && media.additionalUrls.length > 0;
  const carouselCount = isCarousel ? 1 + (media?.additionalUrls?.length || 0) : 0;

  // Filter platforms based on carousel support
  const availablePlatforms = isCarousel
    ? PLATFORMS.filter(p => p.postTypes.some(pt => pt.supportsCarousel))
    : PLATFORMS;

  const currentPlatform = PLATFORMS.find(p => p.id === selectedPlatform);

  // Filter post types based on media type and carousel mode
  const availablePostTypes = currentPlatform?.postTypes.filter(pt => {
    // For carousel, only show carousel-supporting post types
    if (isCarousel) {
      return pt.supportsCarousel;
    }
    // For regular media, filter by type
    if (media?.type === 'image') {
      return pt.supportsImage;
    } else if (media?.type === 'video') {
      return pt.supportsVideo;
    }
    return true;
  }) || [];

  const handlePlatformSelect = useCallback((platformId: string) => {
    setSelectedPlatform(platformId);
    setSelectedPostType(null);
    // For LinkedIn with organization, show target selection first
    if (platformId === 'linkedin') {
      setStep(3); // Go to LinkedIn target selection
    } else {
      setStep(2);
    }
  }, []);

  const handlePostTypeSelect = useCallback((postTypeId: string) => {
    setSelectedPostType(postTypeId);
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedPlatform || !selectedPostType || !media) return;

    setIsSending(true);
    try {
      await onSend({
        platform: selectedPlatform,
        postType: selectedPostType,
        media,
        postToPage: selectedPlatform === 'linkedin' ? linkedInPostToPage ?? false : undefined,
      });
      onClose();
    } catch (error) {
    } finally {
      setIsSending(false);
    }
  }, [selectedPlatform, selectedPostType, media, onSend, onClose, linkedInPostToPage]);

  const handleBack = useCallback(() => {
    if (step === 2 && selectedPlatform === 'linkedin' && linkedInInfo?.organizationId) {
      setStep(3); // Go back to LinkedIn target selection
      setSelectedPostType(null);
    } else if (step === 3) {
      setStep(1); // Go back to platform selection
      setLinkedInPostToPage(null);
    } else {
      setStep(1);
      setSelectedPostType(null);
    }
  }, [step, selectedPlatform, linkedInInfo]);

  // Handle LinkedIn target selection
  const handleLinkedInTargetSelect = useCallback((postToPage: boolean) => {
    setLinkedInPostToPage(postToPage);
    setStep(2); // Proceed to post type selection
  }, []);

  const handleClose = useCallback(() => {
    setSelectedPlatform(null);
    setSelectedPostType(null);
    setLinkedInPostToPage(null);
    setLinkedInInfo(null);
    setStep(1);
    onClose();
  }, [onClose]);

  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {isCarousel ? 'Create Carousel Post' : 'Send to Publish'}
                </h2>
                <p className="text-sm text-white/70">
                  {step === 1
                    ? (isCarousel ? `Select platform for ${carouselCount} images` : 'Select a platform')
                    : step === 3
                      ? 'Choose where to post on LinkedIn'
                      : 'Choose post type'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Media Preview Mini */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
            {isCarousel ? (
              /* Carousel Preview - Show stacked images */
              <div className="relative w-12 h-12">
                {[media.url, ...(media.additionalUrls || [])].slice(0, 3).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="absolute w-10 h-10 rounded-lg object-cover border-2 border-white/30"
                    style={{
                      left: idx * 4,
                      top: idx * 2,
                      zIndex: 3 - idx
                    }}
                  />
                ))}
              </div>
            ) : media.type === 'image' ? (
              <img
                src={media.url}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {isCarousel ? `${carouselCount} images selected` : `${media.prompt.substring(0, 50)}...`}
              </p>
              <Badge variant="secondary" className="mt-1 bg-white/20 text-white text-xs">
                {isCarousel ? (
                  <>
                    <Layers className="w-3 h-3 mr-1" />
                    carousel
                  </>
                ) : media.type === 'image' ? (
                  <>
                    <ImageIcon className="w-3 h-3 mr-1" />
                    {media.type}
                  </>
                ) : (
                  <>
                    <Video className="w-3 h-3 mr-1" />
                    {media.type}
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 ? (
            /* Step 1: Platform Selection */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Where do you want to publish?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {availablePlatforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformSelect(platform.id)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all duration-200
                      hover:border-primary hover:shadow-lg
                      ${selectedPlatform === platform.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center text-white mb-2`}>
                      {platform.icon}
                    </div>
                    <span className="font-medium text-sm">{platform.name}</span>
                    <ArrowRight className="w-4 h-4 absolute top-4 right-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : step === 3 ? (
            /* Step 3: LinkedIn Target Selection (Company Page vs Personal) */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleBack}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-muted-foreground">|</span>
                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white">
                  <Linkedin className="w-4 h-4" />
                </div>
                <span className="font-medium">LinkedIn</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Where do you want to post on LinkedIn?
              </p>

              {loadingLinkedInInfo ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Personal Profile Option */}
                  <button
                    onClick={() => handleLinkedInTargetSelect(false)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                      flex items-center gap-4
                      ${linkedInPostToPage === false
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${linkedInPostToPage === false
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                      }
                    `}>
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Personal Profile</p>
                      <p className="text-sm text-muted-foreground">
                        {linkedInInfo?.profileName || 'Post to your personal LinkedIn profile'}
                      </p>
                    </div>
                    {linkedInPostToPage === false && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>

                  {/* Company Page Option - Only show if organization exists */}
                  {linkedInInfo?.organizationId ? (
                    <button
                      onClick={() => handleLinkedInTargetSelect(true)}
                      className={`
                        w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                        flex items-center gap-4
                        ${linkedInPostToPage === true
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center
                        ${linkedInPostToPage === true
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                        }
                      `}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Company Page</p>
                        <p className="text-sm text-muted-foreground">
                          {linkedInInfo.organizationName || 'Post to your company page'}
                        </p>
                      </div>
                      {linkedInPostToPage === true && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl border-2 border-dashed border-muted bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground">
                        No company page found. Reconnect LinkedIn to access company pages.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Post Type Selection */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleBack}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  ← Back
                </button>
                <span className="text-muted-foreground">|</span>
                <div className={`w-6 h-6 rounded bg-gradient-to-br ${currentPlatform?.color} flex items-center justify-center text-white`}>
                  {currentPlatform?.icon}
                </div>
                <span className="font-medium">{currentPlatform?.name}</span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                What type of post do you want to create?
              </p>

              <div className="space-y-2">
                {availablePostTypes.map((postType) => (
                  <button
                    key={postType.id}
                    onClick={() => handlePostTypeSelect(postType.id)}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                      flex items-center gap-4
                      ${selectedPostType === postType.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${selectedPostType === postType.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {postType.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{postType.name}</p>
                      <p className="text-sm text-muted-foreground">{postType.description}</p>
                    </div>
                    {selectedPostType === postType.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {availablePostTypes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No compatible post types for this media</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!selectedPlatform || !selectedPostType || isSending}
              className="flex-1 text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Send to Publish
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendToPostModal;
