'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Megaphone,
  Layers,
  FileImage,
  Users,
  BarChart3,
  Settings,
  Search,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Circle,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Campaign, AdSet, Ad, DeliveryStatus } from '@/types/metaAds';

interface AdsSidebarProps {
  campaigns: Campaign[];
  adSets: AdSet[];
  ads: Ad[];
  selectedCampaignId?: string;
  selectedAdSetId?: string;
  selectedAdId?: string;
  onSelectCampaign: (id: string | null) => void;
  onSelectAdSet: (id: string | null) => void;
  onSelectAd: (id: string | null) => void;
  onCreateCampaign: () => void;
  onCreateAdSet: (campaignId?: string) => void;
  onCreateAd: (adSetId?: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const DeliveryStatusIcon = ({ status }: { status?: DeliveryStatus }) => {
  switch (status) {
    case 'delivering':
      return <Circle className="w-2 h-2 fill-green-500 text-green-500" />;
    case 'learning':
      return <Zap className="w-3 h-3 text-blue-500" />;
    case 'learning_limited':
      return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    case 'not_delivering':
      return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
    case 'scheduled':
      return <Clock className="w-3 h-3 text-purple-500" />;
    case 'error':
      return <XCircle className="w-3 h-3 text-red-500" />;
    case 'completed':
      return <CheckCircle2 className="w-3 h-3 text-gray-500" />;
    default:
      return <Circle className="w-2 h-2 fill-gray-300 text-gray-300" />;
  }
};

export default function AdsSidebar({
  campaigns = [],
  adSets = [],
  ads = [],
  selectedCampaignId,
  selectedAdSetId,
  selectedAdId,
  onSelectCampaign,
  onSelectAdSet,
  onSelectAd,
  onCreateCampaign,
  onCreateAdSet,
  onCreateAd,
  collapsed = false,
}: AdsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  // Group adSets by campaign
  const adSetsByCampaign = useMemo(() => {
    const grouped: Record<string, AdSet[]> = {};
    adSets.forEach((adSet) => {
      if (!grouped[adSet.campaign_id]) {
        grouped[adSet.campaign_id] = [];
      }
      grouped[adSet.campaign_id].push(adSet);
    });
    return grouped;
  }, [adSets]);

  // Group ads by adSet
  const adsByAdSet = useMemo(() => {
    const grouped: Record<string, Ad[]> = {};
    ads.forEach((ad) => {
      if (!grouped[ad.adset_id]) {
        grouped[ad.adset_id] = [];
      }
      grouped[ad.adset_id].push(ad);
    });
    return grouped;
  }, [ads]);

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    const query = searchQuery.toLowerCase();
    return campaigns.filter((campaign) => {
      if (campaign.name.toLowerCase().includes(query)) return true;
      const campaignAdSets = adSetsByCampaign[campaign.id] || [];
      if (campaignAdSets.some((adSet) => adSet.name.toLowerCase().includes(query))) return true;
      for (const adSet of campaignAdSets) {
        const adSetAds = adsByAdSet[adSet.id] || [];
        if (adSetAds.some((ad) => ad.name.toLowerCase().includes(query))) return true;
      }
      return false;
    });
  }, [campaigns, searchQuery, adSetsByCampaign, adsByAdSet]);

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const toggleAdSet = (adSetId: string) => {
    setExpandedAdSets((prev) => {
      const next = new Set(prev);
      if (next.has(adSetId)) {
        next.delete(adSetId);
      } else {
        next.add(adSetId);
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <div className="w-14 border-r bg-card flex flex-col items-center py-4 gap-2">
        <Button variant="ghost" size="icon" className="w-10 h-10" onClick={onCreateCampaign}>
          <Plus className="w-5 h-5" />
        </Button>
        <div className="w-8 h-px bg-border my-2" />
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Megaphone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Layers className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <FileImage className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <Users className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="w-10 h-10">
          <BarChart3 className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Campaigns</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Plus className="w-4 h-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onCreateCampaign}>
                <Megaphone className="w-4 h-4 mr-2" />
                New Campaign
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateAdSet()}>
                <Layers className="w-4 h-4 mr-2" />
                New Ad Set
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateAd()}>
                <FileImage className="w-4 h-4 mr-2" />
                New Ad
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Tree View */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
            </div>
          ) : (
            filteredCampaigns.map((campaign) => {
              const campaignAdSets = adSetsByCampaign[campaign.id] || [];
              const isExpanded = expandedCampaigns.has(campaign.id);
              const isSelected = selectedCampaignId === campaign.id && !selectedAdSetId;

              return (
                <div key={campaign.id} className="mb-1">
                  {/* Campaign Row */}
                  <div
                    className={cn(
                      'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <button
                      onClick={() => toggleCampaign(campaign.id)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {campaignAdSets.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </button>
                    <DeliveryStatusIcon status={campaign.delivery_status} />
                    <span
                      className="flex-1 text-sm truncate ml-1"
                      onClick={() => {
                        onSelectCampaign(campaign.id);
                        onSelectAdSet(null);
                        onSelectAd(null);
                      }}
                    >
                      {campaign.name}
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                      {campaignAdSets.length}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onCreateAdSet(campaign.id)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Ad Set
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          {campaign.status === 'ACTIVE' ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Campaign
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Activate Campaign
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="w-4 h-4 mr-2" />
                          Edit Campaign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Ad Sets */}
                  {isExpanded && campaignAdSets.length > 0 && (
                    <div className="ml-4 border-l pl-2 mt-1">
                      {campaignAdSets.map((adSet) => {
                        const adSetAds = adsByAdSet[adSet.id] || [];
                        const isAdSetExpanded = expandedAdSets.has(adSet.id);
                        const isAdSetSelected = selectedAdSetId === adSet.id && !selectedAdId;

                        return (
                          <div key={adSet.id} className="mb-1">
                            {/* Ad Set Row */}
                            <div
                              className={cn(
                                'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                                isAdSetSelected
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted/50'
                              )}
                            >
                              <button
                                onClick={() => toggleAdSet(adSet.id)}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                {adSetAds.length > 0 ? (
                                  isAdSetExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )
                                ) : (
                                  <div className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <DeliveryStatusIcon status={adSet.delivery_status} />
                              <span
                                className="flex-1 text-sm truncate ml-1"
                                onClick={() => {
                                  onSelectCampaign(campaign.id);
                                  onSelectAdSet(adSet.id);
                                  onSelectAd(null);
                                }}
                              >
                                {adSet.name}
                              </span>
                              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">
                                {adSetAds.length}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded">
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => onCreateAd(adSet.id)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Ad
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    {adSet.status === 'ACTIVE' ? (
                                      <>
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pause Ad Set
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Activate Ad Set
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Ads */}
                            {isAdSetExpanded && adSetAds.length > 0 && (
                              <div className="ml-4 border-l pl-2 mt-1">
                                {adSetAds.map((ad) => {
                                  const isAdSelected = selectedAdId === ad.id;

                                  return (
                                    <div
                                      key={ad.id}
                                      className={cn(
                                        'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                                        isAdSelected
                                          ? 'bg-primary/10 text-primary'
                                          : 'hover:bg-muted/50'
                                      )}
                                      onClick={() => {
                                        onSelectCampaign(campaign.id);
                                        onSelectAdSet(adSet.id);
                                        onSelectAd(ad.id);
                                      }}
                                    >
                                      <div className="w-4 h-4" />
                                      <DeliveryStatusIcon status={ad.delivery_status} />
                                      <span className="flex-1 text-sm truncate ml-1">
                                        {ad.name}
                                      </span>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded">
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                          <DropdownMenuItem>
                                            {ad.status === 'ACTIVE' ? (
                                              <>
                                                <Pause className="w-4 h-4 mr-2" />
                                                Pause Ad
                                              </>
                                            ) : (
                                              <>
                                                <Play className="w-4 h-4 mr-2" />
                                                Activate Ad
                                              </>
                                            )}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="p-3 border-t bg-muted/30">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campaigns</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{adSets.length}</p>
            <p className="text-xs text-muted-foreground">Ad Sets</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{ads.length}</p>
            <p className="text-xs text-muted-foreground">Ads</p>
          </div>
        </div>
      </div>
    </div>
  );
}
