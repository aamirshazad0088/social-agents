'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Campaign, AdSet, Ad, DatePreset } from '@/types/metaAds';

interface AdsAnalyticsProps {
  campaigns: Campaign[];
  adSets: AdSet[];
  ads: Ad[];
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

export default function AdsAnalytics({ campaigns = [], adSets = [], ads = [] }: AdsAnalyticsProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>('last_7d');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  // Calculate aggregate metrics
  const filteredCampaigns = selectedCampaign === 'all'
    ? campaigns
    : campaigns.filter(c => c.id === selectedCampaign);

  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.insights?.spend || 0), 0);
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.insights?.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.insights?.clicks || 0), 0);
  const totalReach = filteredCampaigns.reduce((sum, c) => sum + (c.insights?.reach || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + (c.insights?.conversions || 0), 0);

  // Mock trend data (in real app, compare with previous period)
  const trends = {
    spend: 12.5,
    impressions: 8.2,
    clicks: 15.3,
    reach: 6.8,
    ctr: 2.1,
    cpc: -5.2,
    cpm: 3.4,
    conversions: 18.7,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">Track your advertising performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spend"
          value={`$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={trends.spend}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(totalImpressions)}
          trend={trends.impressions}
          icon={Eye}
          color="blue"
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(totalClicks)}
          trend={trends.clicks}
          icon={MousePointerClick}
          color="purple"
        />
        <MetricCard
          title="Reach"
          value={formatNumber(totalReach)}
          trend={trends.reach}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SecondaryMetricCard
          title="CTR"
          value={`${avgCTR.toFixed(2)}%`}
          trend={trends.ctr}
          description="Click-through rate"
        />
        <SecondaryMetricCard
          title="CPC"
          value={`$${avgCPC.toFixed(2)}`}
          trend={trends.cpc}
          description="Cost per click"
        />
        <SecondaryMetricCard
          title="CPM"
          value={`$${avgCPM.toFixed(2)}`}
          trend={trends.cpm}
          description="Cost per 1,000 impressions"
        />
        <SecondaryMetricCard
          title="Conversions"
          value={formatNumber(totalConversions)}
          trend={trends.conversions}
          description="Total conversions"
        />
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance Over Time
          </CardTitle>
          <CardDescription>Daily performance metrics for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Performance chart</p>
              <p className="text-sm text-muted-foreground">Connect your Meta account to see real data</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Campaign Performance</CardTitle>
          <CardDescription>Detailed breakdown by campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Spend</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Impressions</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Clicks</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">CTR</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">CPC</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((campaign) => {
                    const ctr = campaign.insights?.impressions
                      ? ((campaign.insights.clicks / campaign.insights.impressions) * 100).toFixed(2)
                      : '0.00';
                    const cpc = campaign.insights?.clicks
                      ? (campaign.insights.spend / campaign.insights.clicks).toFixed(2)
                      : '0.00';

                    return (
                      <tr key={campaign.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              campaign.status === 'ACTIVE' ? "bg-green-500" : "bg-yellow-500"
                            )} />
                            <span className="font-medium">{campaign.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          ${(campaign.insights?.spend || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right">
                          {formatNumber(campaign.insights?.impressions || 0)}
                        </td>
                        <td className="p-3 text-right">
                          {formatNumber(campaign.insights?.clicks || 0)}
                        </td>
                        <td className="p-3 text-right">{ctr}%</td>
                        <td className="p-3 text-right">${cpc}</td>
                        <td className="p-3 text-right">
                          {campaign.insights?.conversions || 0}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No campaign data available
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredCampaigns.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right">${totalSpend.toFixed(2)}</td>
                    <td className="p-3 text-right">{formatNumber(totalImpressions)}</td>
                    <td className="p-3 text-right">{formatNumber(totalClicks)}</td>
                    <td className="p-3 text-right">{avgCTR.toFixed(2)}%</td>
                    <td className="p-3 text-right">${avgCPC.toFixed(2)}</td>
                    <td className="p-3 text-right">{totalConversions}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Ad Sets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Top Ad Sets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adSets.length > 0 ? (
              <div className="space-y-3">
                {adSets.slice(0, 5).map((adSet, index) => (
                  <div
                    key={adSet.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{adSet.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(adSet.insights?.impressions || 0)} impressions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(adSet.insights?.spend || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {((adSet.insights?.ctr || 0)).toFixed(2)}% CTR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No ad set data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Ads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Top Performing Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ads.length > 0 ? (
              <div className="space-y-3">
                {ads.slice(0, 5).map((ad, index) => (
                  <div
                    key={ad.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{ad.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(ad.insights?.clicks || 0)} clicks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{((ad.insights?.ctr || 0)).toFixed(2)}%</p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No ad data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  trend: number;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  const colorClasses = {
    green: 'from-green-500/10 to-green-500/5 text-green-600',
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-600',
    purple: 'from-purple-500/10 to-purple-500/5 text-purple-600',
    orange: 'from-orange-500/10 to-orange-500/5 text-orange-600',
  };

  const isPositive = trend >= 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-xl bg-gradient-to-br", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trend)}%
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  );
}

function SecondaryMetricCard({
  title,
  value,
  trend,
  description,
}: {
  title: string;
  value: string;
  trend: number;
  description: string;
}) {
  const isPositive = trend >= 0;
  // For CPC, negative trend is good (lower cost)
  const isGood = title === 'CPC' ? !isPositive : isPositive;

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isGood ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </div>
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
