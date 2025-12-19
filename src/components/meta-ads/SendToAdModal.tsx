'use client';

/**
 * SendToAdModal - Simplified Ad Creative Creator
 * 
 * Purpose: Create ad creatives from generated content
 * Workflow:
 *   1. User selects content from library
 *   2. Opens this modal to add creative details
 *   3. Choose: Save to Library (draft) OR Add to existing Campaign
 *   4. Submit
 * 
 * Campaign/AdSet management is handled in MetaAdsManager
 */

import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  Layers,
  Loader2,
  ExternalLink,
  Save,
  Send,
  Check,
  Music,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

// Call to action options per Meta Marketing API v24.0
const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'BOOK_TRAVEL', label: 'Book Now' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'WATCH_MORE', label: 'Watch More' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { value: 'SEND_MESSAGE', label: 'Send Message' },
  { value: 'LIKE_PAGE', label: 'Like Page' },
  { value: 'MESSAGE_PAGE', label: 'Message Page' },
  { value: 'GET_PROMOTIONS', label: 'Get Promotions' },
  { value: 'BUY_NOW', label: 'Buy Now' },
  { value: 'CALL_NOW', label: 'Call Now' },
];

// Exported Types for backward compatibility
export interface MediaToSendToAd {
  url: string;
  type: 'image' | 'video' | 'audio';
  prompt?: string;
  additionalUrls?: string[];
}

export interface AdConfig {
  adName?: string;
  headline: string;
  primaryText: string;
  destinationUrl: string;
  callToAction: string;
  platform: string;
  media: {
    url: string;
    type: 'image' | 'video' | 'audio';
    additionalUrls?: string[];
  };
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface AdSet {
  id: string;
  name: string;
  campaign_id: string;
}

interface SendToAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaToSendToAd | null;
  onSuccess?: () => void;
  onSend?: (config: AdConfig) => void; // Legacy callback support
}

export default function SendToAdModal({
  isOpen,
  onClose,
  media,
  onSuccess,
  onSend,
}: SendToAdModalProps) {
  // Return null if no media
  if (!media) {
    return null;
  }
  // Form state
  const [destination, setDestination] = useState<'library' | 'campaign'>('library');
  const [adName, setAdName] = useState('');
  const [headline, setHeadline] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');

  // Campaign assignment state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedAdSetId, setSelectedAdSetId] = useState('');
  const [filteredAdSets, setFilteredAdSets] = useState<AdSet[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  // Load campaigns when destination is 'campaign'
  useEffect(() => {
    if (destination === 'campaign' && campaigns.length === 0) {
      loadCampaigns();
    }
  }, [destination, campaigns.length]);

  // Filter ad sets when campaign changes
  useEffect(() => {
    if (selectedCampaignId) {
      setFilteredAdSets(adSets.filter(as => as.campaign_id === selectedCampaignId));
      setSelectedAdSetId('');
    } else {
      setFilteredAdSets([]);
    }
  }, [selectedCampaignId, adSets]);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const [campaignsRes, adSetsRes] = await Promise.all([
        fetch('/api/meta-ads/campaigns'),
        fetch('/api/meta-ads/adsets'),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }

      if (adSetsRes.ok) {
        const data = await adSetsRes.json();
        setAdSets(data.adSets || []);
      }
    } catch (error) {
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!headline.trim()) {
      toast.error('Headline is required');
      return;
    }
    if (!destinationUrl.trim()) {
      toast.error('Destination URL is required');
      return;
    }
    if (destination === 'campaign' && (!selectedCampaignId || !selectedAdSetId)) {
      toast.error('Please select a campaign and ad set');
      return;
    }

    setIsLoading(true);

    // Build config object for both legacy callback and API
    const adConfig: AdConfig = {
      adName: adName || headline,
      headline,
      primaryText,
      destinationUrl,
      callToAction,
      platform: 'both',
      media: {
        url: media.url,
        type: media.type,
        additionalUrls: media.additionalUrls,
      },
    };

    // If legacy onSend callback is provided, use that instead of API
    if (onSend) {
      onSend(adConfig);
      handleClose();
      setIsLoading(false);
      return;
    }

    try {
      if (destination === 'library') {
        // Save to library as draft
        const response = await fetch('/api/meta-ads/ads/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adConfig }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Ad saved to library');
          handleClose();
          onSuccess?.();
        } else {
          toast.error(data.error || 'Failed to save ad');
        }
      } else {
        // Add directly to campaign
        const response = await fetch('/api/meta-ads/ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adName || headline,
            adset_id: selectedAdSetId,
            status: 'PAUSED',
            creative: {
              title: headline,
              body: primaryText,
              call_to_action_type: callToAction,
              link_url: destinationUrl,
              image_url: media.type === 'image' ? media.url : undefined,
              video_url: media.type === 'video' ? media.url : undefined,
            },
          }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Ad added to campaign');
          handleClose();
          onSuccess?.();
        } else {
          toast.error(data.error || 'Failed to create ad');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAdName('');
    setHeadline('');
    setPrimaryText('');
    setDestinationUrl('');
    setCallToAction('LEARN_MORE');
    setDestination('library');
    setSelectedCampaignId('');
    setSelectedAdSetId('');
    onClose();
  };

  // Get media type label
  const getMediaType = () => {
    if (media.additionalUrls && media.additionalUrls.length > 0) return 'Carousel';
    if (media.type === 'video') return 'Video';
    return 'Image';
  };

  const getMediaIcon = () => {
    if (media.additionalUrls && media.additionalUrls.length > 0) return <Layers className="w-4 h-4" />;
    if (media.type === 'video') return <Video className="w-4 h-4" />;
    if (media.type === 'audio') return <Music className="w-4 h-4" />;
    return <ImageIcon className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getMediaIcon()}
            Create Ad from {getMediaType()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {media.type === 'video' ? (
              <video
                src={media.url}
                className="w-full h-full object-cover"
                controls
                muted
              />
            ) : media.type === 'audio' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                <div className="p-4 bg-background rounded-full mb-4">
                  {/* Placeholder for audio icon if import is tricky, but I can use Video as fallback or just text */}
                  Audio Preview
                </div>
                <audio src={media.url} controls />
              </div>
            ) : (
              <img
                src={media.url}
                alt="Ad preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Destination Selection */}
          <div className="space-y-3">
            <Label>Where to save this ad?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestination('library')}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${destination === 'library'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${destination === 'library' ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                  {destination === 'library' && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-1">
                    <Save className="w-4 h-4" />
                    Save to Library
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Draft for later
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestination('campaign')}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${destination === 'campaign'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${destination === 'campaign' ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                  {destination === 'campaign' && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-1">
                    <Send className="w-4 h-4" />
                    Add to Campaign
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Publish now
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Campaign Selection (when destination is campaign) */}
          {destination === 'campaign' && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              {isLoadingCampaigns ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No campaigns available
                          </SelectItem>
                        ) : (
                          campaigns.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {campaigns.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Create a campaign in Ads Manager first
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Ad Set</Label>
                    <Select
                      value={selectedAdSetId}
                      onValueChange={setSelectedAdSetId}
                      disabled={!selectedCampaignId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedCampaignId
                            ? "Select campaign first"
                            : "Select an ad set"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAdSets.length === 0 ? (
                          <SelectItem value="_none" disabled>
                            No ad sets available
                          </SelectItem>
                        ) : (
                          filteredAdSets.map(as => (
                            <SelectItem key={as.id} value={as.id}>
                              {as.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Ad Creative Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Ad Creative
            </h3>

            {/* Ad Name (optional) */}
            <div className="space-y-2">
              <Label htmlFor="adName">
                Ad Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="adName"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                placeholder="My Ad"
                maxLength={255}
              />
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <Label htmlFor="headline">
                Headline <span className="text-red-500">*</span>
              </Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Catchy headline for your ad"
                maxLength={40}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {headline.length}/40
              </p>
            </div>

            {/* Primary Text */}
            <div className="space-y-2">
              <Label htmlFor="primaryText">Primary Text</Label>
              <Textarea
                id="primaryText"
                value={primaryText}
                onChange={(e) => setPrimaryText(e.target.value)}
                placeholder="Tell people about your product or service..."
                maxLength={125}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {primaryText.length}/125
              </p>
            </div>

            {/* Destination URL */}
            <div className="space-y-2">
              <Label htmlFor="destinationUrl">
                Destination URL <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="destinationUrl"
                  type="url"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="pr-8"
                />
                {destinationUrl && (
                  <a
                    href={destinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <Select value={callToAction} onValueChange={setCallToAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CTA_OPTIONS.map(cta => (
                    <SelectItem key={cta.value} value={cta.value}>
                      {cta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : destination === 'library' ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {destination === 'library' ? 'Save to Library' : 'Add to Campaign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
