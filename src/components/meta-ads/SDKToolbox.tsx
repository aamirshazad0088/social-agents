'use client';

import React, { useState } from 'react';
import {
    Wrench,
    Target,
    Users,
    FileText,
    Activity,
    Video,
    Building2,
    Zap,
    Upload,
    Search,
    Plus,
    Loader2,
    RefreshCw,
    TrendingUp,
    MapPin,
    Eye,
    BarChart,
    Monitor,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SDKToolboxProps {
    onRefresh?: () => void;
}

export default function SDKToolbox({ onRefresh }: SDKToolboxProps) {
    return (
        <div className="space-y-6">
            {/* Header - Clean & Professional */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <Wrench className="w-4 h-4" />
                        </div>
                        SDK Toolbox
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Advanced Meta SDK features</p>
                </div>
            </div>

            <Tabs defaultValue="reach" className="space-y-4">
                <div className="overflow-x-auto scrollbar-hide">
                    <TabsList className="inline-flex gap-1 h-auto p-1 bg-muted/50 rounded-lg">
                        <TabsTrigger value="reach" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Reach
                        </TabsTrigger>
                        <TabsTrigger value="targeting" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Target className="w-3.5 h-3.5" />
                            Targeting
                        </TabsTrigger>
                        <TabsTrigger value="audiences" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Users className="w-3.5 h-3.5" />
                            Audiences
                        </TabsTrigger>
                        <TabsTrigger value="leads" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="w-3.5 h-3.5" />
                            Leads
                        </TabsTrigger>
                        <TabsTrigger value="pixels" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Activity className="w-3.5 h-3.5" />
                            Pixels
                        </TabsTrigger>
                        <TabsTrigger value="videos" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Video className="w-3.5 h-3.5" />
                            Videos
                        </TabsTrigger>
                        <TabsTrigger value="business" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building2 className="w-3.5 h-3.5" />
                            Business
                        </TabsTrigger>
                        <TabsTrigger value="conversions" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Zap className="w-3.5 h-3.5" />
                            Conversions
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="gap-1.5 text-xs h-8 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <BarChart className="w-3.5 h-3.5" />
                            Reports
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Reach Estimation Tab */}
                <TabsContent value="reach">
                    <ReachEstimationPanel />
                </TabsContent>

                {/* Targeting Tab */}
                <TabsContent value="targeting">
                    <TargetingPanel />
                </TabsContent>

                {/* Saved Audiences Tab */}
                <TabsContent value="audiences">
                    <SavedAudiencesPanel />
                </TabsContent>

                {/* Lead Forms Tab */}
                <TabsContent value="leads">
                    <LeadFormsPanel />
                </TabsContent>

                {/* Pixels Tab */}
                <TabsContent value="pixels">
                    <PixelsPanel />
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos">
                    <VideosPanel />
                </TabsContent>

                {/* Business Assets Tab */}
                <TabsContent value="business">
                    <BusinessAssetsPanel />
                </TabsContent>

                {/* Conversions Tab */}
                <TabsContent value="conversions">
                    <ConversionsPanel />
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview">
                    <AdPreviewPanel />
                </TabsContent>

                {/* Async Reports Tab */}
                <TabsContent value="reports">
                    <AsyncReportsPanel />
                </TabsContent>

                {/* Ad Library Tab */}
                <TabsContent value="ad-library">
                    <AdLibraryPanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// =============================================================================
// AD LIBRARY PANEL
// =============================================================================

function AdLibraryPanel() {
    const [pageId, setPageId] = useState('');
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const analyzePage = async () => {
        if (!pageId.trim()) return;
        setIsLoading(true);
        setResult(null);
        try {
            const response = await fetch(`/api/v1/meta-ads/sdk/ad-library/analyze/${pageId}`);
            if (response.ok) {
                const data = await response.json();
                setResult(data);
            }
        } catch (err) {
            console.error('Analysis failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        Competitor Analysis
                    </CardTitle>
                    <CardDescription>Analyze Page Strategy via Ad Library</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Input
                            placeholder="Page ID"
                            value={pageId}
                            onChange={(e) => setPageId(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={analyzePage} disabled={isLoading || !pageId.trim()} className="gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Analyze
                        </Button>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                        <p>Enter a Facebook Page ID to see:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Active vs Inactive Ads count</li>
                            <li>Platform distribution (FB, IG, etc.)</li>
                            <li>Format distribution (Image, Video, Text)</li>
                            <li>Average ad longevity</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                    {result ? (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{result.analysis?.active_ads || 0}</div>
                                    <div className="text-xs">Active Ads</div>
                                </div>
                                <div className="p-3 bg-gray-50 text-gray-700 rounded-lg text-center">
                                    <div className="text-2xl font-bold">{result.analysis?.total_ads || 0}</div>
                                    <div className="text-xs">Total Ads Scanned</div>
                                </div>
                            </div>

                            {/* Avg Age */}
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span className="text-sm font-medium">Avg Ad Longevity</span>
                                <span className="font-bold">{result.analysis?.avg_ad_age_days || 0} days</span>
                            </div>

                            {/* Platforms */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Platform Usage</h4>
                                <div className="space-y-2">
                                    {Object.entries(result.analysis?.platform_distribution || {}).map(([platform, count]: [string, any]) => (
                                        <div key={platform} className="flex items-center justify-between text-sm">
                                            <span className="capitalize">{platform.replace('_', ' ')}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${(count / (result.analysis?.total_ads || 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-muted-foreground w-8 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Run analysis to view data
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// REACH ESTIMATION PANEL
// =============================================================================

// =============================================================================
// REACH ESTIMATION PANEL
// =============================================================================

function ReachEstimationPanel() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [ageMin, setAgeMin] = useState('18');
    const [ageMax, setAgeMax] = useState('65');
    const [countries, setCountries] = useState('US');
    const [budget, setBudget] = useState('100');
    const [currency, setCurrency] = useState('USD');
    const [goal, setGoal] = useState('REACH');

    const estimateReach = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/reach/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targeting_spec: {
                        age_min: parseInt(ageMin),
                        age_max: parseInt(ageMax),
                        geo_locations: { countries: countries.split(',').map(c => c.trim()) }
                    },
                    budget: parseFloat(budget) * 100, // Convert to cents
                    currency: currency,
                    optimization_goal: goal
                })
            });
            if (response.ok) {
                setResult(await response.json());
            }
        } catch (err) {
            console.error('Reach estimation failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Estimate Audience Reach</CardTitle>
                    <CardDescription>Preview audience size before launching</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Min Age</Label>
                            <Input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                        </div>
                        <div>
                            <Label>Max Age</Label>
                            <Input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Budget</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    className="pl-7"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Optimization Goal</Label>
                        <Select value={goal} onValueChange={setGoal}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="REACH">Reach</SelectItem>
                                <SelectItem value="IMPRESSIONS">Impressions</SelectItem>
                                <SelectItem value="LINK_CLICKS">Link Clicks</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Countries (comma-separated)</Label>
                        <Input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="US,CA,GB" />
                    </div>

                    <Button onClick={estimateReach} disabled={isLoading} className="w-full gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        Estimate Reach
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent>
                    {result ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-500">
                                        {result.reach_estimate?.toLocaleString() || 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Estimated Reach</div>
                                </div>
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-500">
                                        {result.impressions?.toLocaleString() || 0}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Impressions</div>
                                </div>
                            </div>

                            {result.budget > 0 && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-sm text-center">
                                    Based on daily budget of <strong>{currency} {(result.budget / 100).toFixed(2)}</strong>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Configure targeting and click estimate
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// TARGETING PANEL
// =============================================================================

// =============================================================================
// TARGETING PANEL
// =============================================================================

function TargetingPanel() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('adinterest');
    const [targetClass, setTargetClass] = useState('interests');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mode, setMode] = useState<'search' | 'browse'>('search');

    const searchTargeting = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const response = await fetch(`/api/v1/meta-ads/sdk/targeting/search?q=${encodeURIComponent(query)}&type=${type}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data.options || []);
            }
        } catch (err) {
            console.error('Targeting search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const browseTargeting = async () => {
        setIsSearching(true);
        try {
            // Map class to type automatically for common cases
            let searchType = 'adinterest';
            if (targetClass === 'behaviors') searchType = 'adbehavior';
            if (targetClass === 'demographics') searchType = 'addemographic';

            const response = await fetch(`/api/v1/meta-ads/sdk/targeting/browse?type=${searchType}&target_class=${targetClass}`);
            if (response.ok) {
                const data = await response.json();
                setResults(data.categories || []);
            }
        } catch (err) {
            console.error('Targeting browse failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const CLASSES = [
        { value: 'interests', label: 'Interests' },
        { value: 'behaviors', label: 'Behaviors' },
        { value: 'demographics', label: 'Demographics' },
        { value: 'life_events', label: 'Life Events' },
        { value: 'industries', label: 'Industries' },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-500" />
                    Targeting Exploration
                </CardTitle>
                <CardDescription>Search or browse Meta's detailed targeting options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs value={mode} onValueChange={(v: any) => { setMode(v); setResults([]); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="search">Search</TabsTrigger>
                        <TabsTrigger value="browse">Browse Categories</TabsTrigger>
                    </TabsList>

                    <TabsContent value="search" className="space-y-4">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Search interests, job titles..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && searchTargeting()}
                                className="flex-1"
                            />
                            <Button onClick={searchTargeting} disabled={isSearching} className="gap-2">
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Search
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="browse" className="space-y-4">
                        <div className="flex gap-3">
                            <Select value={targetClass} onValueChange={setTargetClass}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASSES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={browseTargeting} disabled={isSearching} className="gap-2">
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                Browse
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>

                {results.length > 0 && (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        <div className="text-xs text-muted-foreground mb-2">{results.length} results found</div>
                        {results.map((r, i) => (
                            <div key={i} className="p-3 bg-muted rounded-lg flex items-center justify-between hover:bg-muted/80 transition-colors">
                                <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {r.name}
                                        {r.type && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded capitalize">{r.type}</span>}
                                    </div>
                                    {r.path?.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-0.5">{r.path.join(' > ')}</div>
                                    )}
                                </div>
                                {r.audience_size && (
                                    <div className="text-sm text-muted-foreground bg-background px-2 py-1 rounded border">
                                        {typeof r.audience_size === 'number'
                                            ? r.audience_size.toLocaleString()
                                            : r.audience_size} users
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// SAVED AUDIENCES PANEL
// =============================================================================

function SavedAudiencesPanel() {
    const [audiences, setAudiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchAudiences = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/saved-audiences');
            if (response.ok) {
                const data = await response.json();
                setAudiences(data.audiences || []);
            }
        } catch (err) {
            console.error('Fetch audiences failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Saved Audiences
                    </CardTitle>
                    <CardDescription>Reusable targeting templates</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchAudiences} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Load
                </Button>
            </CardHeader>
            <CardContent>
                {audiences.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Click Load to fetch saved audiences
                    </div>
                ) : (
                    <div className="space-y-2">
                        {audiences.map(a => (
                            <div key={a.id} className="p-3 bg-muted rounded-lg">
                                <div className="font-medium">{a.name}</div>
                                <div className="text-sm text-muted-foreground">
                                    ~{a.approximate_count?.toLocaleString() || 0} users
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// LEAD FORMS PANEL
// =============================================================================

// =============================================================================
// LEAD FORMS PANEL
// =============================================================================

function LeadFormsPanel() {
    const [pageId, setPageId] = useState('');
    const [forms, setForms] = useState<any[]>([]);
    const [selectedForm, setSelectedForm] = useState<string | null>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchForms = async () => {
        if (!pageId.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/meta-ads/sdk/lead-forms?page_id=${pageId}`);
            if (response.ok) {
                const data = await response.json();
                setForms(data.forms || []);
            }
        } catch (err) {
            console.error('Fetch forms failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLeads = async (formId: string, afterCursor: string | null = null) => {
        setIsLoading(true);
        if (!afterCursor) setLeads([]);

        try {
            let url = `/api/v1/meta-ads/sdk/leads/${formId}?limit=25`;
            if (afterCursor) url += `&after=${afterCursor}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setLeads(prev => [...prev, ...(data.leads || [])]);
                setCursor(data.paging?.cursors?.after || null);
            }
        } catch (err) {
            console.error('Fetch leads failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-500" />
                        Lead Forms
                    </CardTitle>
                    <CardDescription>Manage lead generation forms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <Input
                            placeholder="Page ID"
                            value={pageId}
                            onChange={(e) => setPageId(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={fetchForms} disabled={isLoading || !pageId.trim()} className="gap-2">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Fetch
                        </Button>
                    </div>

                    {forms.length > 0 && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {forms.map(f => (
                                <div
                                    key={f.id}
                                    className={`p-3 rounded-lg flex items-center justify-between cursor-pointer border ${selectedForm === f.id ? 'bg-teal-50 border-teal-500' : 'bg-muted border-transparent hover:bg-muted/80'
                                        }`}
                                    onClick={() => { setSelectedForm(f.id); fetchLeads(f.id); }}
                                >
                                    <div>
                                        <div className="font-medium text-sm">{f.name}</div>
                                        <div className="text-xs text-muted-foreground">{f.leads_count} leads</div>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 text-xs rounded-full",
                                        f.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    )}>
                                        {f.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Leads Data</CardTitle>
                    <CardDescription>
                        {selectedForm ? `${leads.length} leads loaded` : 'Select a form to view leads'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {leads.length > 0 ? (
                        <div className="space-y-4">
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {leads.map((lead, i) => (
                                    <div key={lead.id} className="p-3 bg-muted rounded-lg text-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold">Lead #{i + 1}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(lead.created_time).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            {Object.entries(lead.data || {}).map(([key, val]: [string, any]) => (
                                                <div key={key}>
                                                    <span className="font-medium text-muted-foreground">{key}:</span> {val}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {cursor && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => selectedForm && fetchLeads(selectedForm, cursor)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Load More Leads
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            {selectedForm ? 'No leads found' : 'Select a form on the left'}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// PIXELS PANEL
// =============================================================================

function PixelsPanel() {
    const [pixels, setPixels] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPixels = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/pixels');
            if (response.ok) {
                const data = await response.json();
                setPixels(data.pixels || []);
            }
        } catch (err) {
            console.error('Fetch pixels failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-500" />
                        Meta Pixels
                    </CardTitle>
                    <CardDescription>Track conversions and events</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchPixels} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Load
                </Button>
            </CardHeader>
            <CardContent>
                {pixels.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Click Load to fetch pixels
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pixels.map(p => (
                            <div key={p.id} className="p-3 bg-muted rounded-lg">
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                                {p.last_fired_time && (
                                    <div className="text-xs text-green-600 mt-1">
                                        Last fired: {new Date(p.last_fired_time).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// VIDEOS PANEL
// =============================================================================

function VideosPanel() {
    const [videos, setVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchVideos = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/videos');
            if (response.ok) {
                const data = await response.json();
                setVideos(data.videos || []);
            }
        } catch (err) {
            console.error('Fetch videos failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-rose-500" />
                        Ad Videos
                    </CardTitle>
                    <CardDescription>Manage video creatives</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchVideos} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Load
                </Button>
            </CardHeader>
            <CardContent>
                {videos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Click Load to fetch videos
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {videos.map(v => (
                            <div key={v.id} className="p-3 bg-muted rounded-lg">
                                <div className="font-medium text-sm">{v.title || 'Untitled'}</div>
                                <div className="text-xs text-muted-foreground">
                                    {v.length ? `${Math.round(v.length)}s` : 'Processing...'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// BUSINESS ASSETS PANEL
// =============================================================================

function BusinessAssetsPanel() {
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchBusinesses = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/businesses');
            if (response.ok) {
                const data = await response.json();
                setBusinesses(data.businesses || []);
            }
        } catch (err) {
            console.error('Fetch businesses failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        Business Assets
                    </CardTitle>
                    <CardDescription>Manage business accounts and pages</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchBusinesses} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Load
                </Button>
            </CardHeader>
            <CardContent>
                {businesses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Click Load to fetch businesses
                    </div>
                ) : (
                    <div className="space-y-2">
                        {businesses.map(b => (
                            <div key={b.id} className="p-3 bg-muted rounded-lg flex items-center gap-3">
                                {b.profile_picture_uri && (
                                    <img src={b.profile_picture_uri} className="w-10 h-10 rounded-full" alt="" />
                                )}
                                <div>
                                    <div className="font-medium">{b.name}</div>
                                    <div className="text-xs text-muted-foreground font-mono">{b.id}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =============================================================================
// CONVERSIONS PANEL
// =============================================================================

function ConversionsPanel() {
    const [conversions, setConversions] = useState<any[]>([]);
    const [offlineDatasets, setOfflineDatasets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("custom");

    const fetchConversions = async () => {
        setIsLoading(true);
        try {
            // Fetch Custom Conversions
            const customRes = await fetch('/api/v1/meta-ads/sdk/custom-conversions');
            if (customRes.ok) {
                const data = await customRes.json();
                setConversions(data.conversions || []);
            }

            // Fetch Offline Datasets (assuming business_id is handled by backend or default)
            // Note: In a real app, we'd need to select a business first.
            // For now, we'll try to fetch with a placeholder or inferred business if supported,
            // or just skip if no business context.
            // The backend endpoint requires business_id. 
            // We'll skip offline fetch if we don't have business context easily, or mock it for now.
            const offlineRes = await fetch('/api/v1/meta-ads/sdk/offline-conversions/datasets?business_id=me');
            if (offlineRes.ok) {
                const data = await offlineRes.json();
                setOfflineDatasets(data.datasets || []);
            }
        } catch (err) {
            console.error('Fetch conversions failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        Conversions API & Offline
                    </CardTitle>
                    <CardDescription>Manage Custom Conversions and Offline Events</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchConversions} disabled={isLoading} className="gap-2">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Load
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="custom">Custom Conversions</TabsTrigger>
                        <TabsTrigger value="offline">Offline Datasets</TabsTrigger>
                    </TabsList>

                    <TabsContent value="custom">
                        {conversions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No custom conversions found.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {conversions.map(c => (
                                    <div key={c.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-sm">{c.name}</div>
                                            <div className="text-xs text-muted-foreground">{c.custom_event_type}</div>
                                        </div>
                                        {c.default_conversion_value && (
                                            <span className="text-sm font-medium text-green-600">
                                                ${c.default_conversion_value}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="offline">
                        {offlineDatasets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No offline datasets found.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {offlineDatasets.map(d => (
                                    <div key={d.id} className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-sm">{d.name}</div>
                                            <div className="text-xs text-muted-foreground">{d.description || 'No description'}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                {d.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

// =============================================================================
// AD PREVIEW PANEL
// =============================================================================

function AdPreviewPanel() {
    const [adId, setAdId] = useState('');
    const [format, setFormat] = useState('DESKTOP_FEED_STANDARD');
    const [previewHtml, setPreviewHtml] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formats, setFormats] = useState<string[]>([]);

    // Load formats on mount
    React.useEffect(() => {
        fetch('/api/v1/meta-ads/sdk/preview/formats')
            .then(res => res.json())
            .then(data => setFormats(data.formats || []))
            .catch(console.error);
    }, []);

    const generatePreview = async () => {
        if (!adId.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/meta-ads/sdk/preview/ad/${adId}?format=${format}`);
            if (response.ok) {
                const data = await response.json();
                if (data.previews?.length > 0) {
                    setPreviewHtml(data.previews[0].body || '');
                }
            }
        } catch (err) {
            console.error('Preview failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const PREVIEW_FORMATS = [
        { value: 'DESKTOP_FEED_STANDARD', label: 'Desktop Feed' },
        { value: 'MOBILE_FEED_STANDARD', label: 'Mobile Feed' },
        { value: 'INSTAGRAM_STANDARD', label: 'Instagram Feed' },
        { value: 'INSTAGRAM_STORY', label: 'Instagram Story' },
        { value: 'FACEBOOK_STORY_MOBILE', label: 'Facebook Story' },
        { value: 'RIGHT_COLUMN_STANDARD', label: 'Right Column' },
    ];

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-cyan-500" />
                        Ad Preview
                    </CardTitle>
                    <CardDescription>Preview ads before publishing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Ad ID</Label>
                        <Input
                            value={adId}
                            onChange={(e) => setAdId(e.target.value)}
                            placeholder="Enter Ad ID"
                        />
                    </div>
                    <div>
                        <Label>Preview Format</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PREVIEW_FORMATS.map(f => (
                                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={generatePreview} disabled={isLoading || !adId.trim()} className="w-full gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Generate Preview
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>{format.replace(/_/g, ' ')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {previewHtml ? (
                        <div
                            className="border rounded-lg overflow-hidden bg-white"
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Enter an Ad ID and click Generate Preview
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// =============================================================================
// ASYNC REPORTS PANEL
// =============================================================================

function AsyncReportsPanel() {
    const [level, setLevel] = useState('campaign');
    const [status, setStatus] = useState<string>('');
    const [reportId, setReportId] = useState('');
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [breakdowns, setBreakdowns] = useState<string[]>([]);

    const startReport = async () => {
        setIsLoading(true);
        setStatus('STARTING');
        setResults([]);
        setProgress(0);
        try {
            const response = await fetch('/api/v1/meta-ads/sdk/reports/async', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level,
                    date_preset: 'last_30d',
                    fields: ['campaign_name', 'impressions', 'clicks', 'spend', 'cpc', 'ctr'],
                    breakdowns: breakdowns.length > 0 ? breakdowns : undefined
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setReportId(data.report_run_id);
                    pollStatus(data.report_run_id);
                } else {
                    setStatus('FAILED: ' + data.error);
                }
            }
        } catch (err) {
            console.error('Start report failed:', err);
            setStatus('ERROR');
        } finally {
            setIsLoading(false);
        }
    };

    const pollStatus = async (runId: string) => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/meta-ads/sdk/reports/async/${runId}/status`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setStatus(data.async_status);
                        setProgress(data.async_percent_completion || 0);

                        if (data.async_status === 'Job Completed') {
                            clearInterval(interval);
                            fetchResults(runId);
                        } else if (data.async_status === 'Job Failed' || data.async_status === 'Job Skipped') {
                            clearInterval(interval);
                        }
                    }
                }
            } catch (err) {
                console.error('Poll failed:', err);
                clearInterval(interval);
            }
        }, 2000);
    };

    const fetchResults = async (runId: string) => {
        try {
            const response = await fetch(`/api/v1/meta-ads/sdk/reports/async/${runId}/results`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setResults(data.data || []);
                }
            }
        } catch (err) {
            console.error('Fetch results failed:', err);
        }
    };

    const toggleBreakdown = (val: string) => {
        setBreakdowns(prev =>
            prev.includes(val) ? prev.filter(b => b !== val) : [...prev, val]
        );
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-indigo-500" />
                        Async Reporting
                    </CardTitle>
                    <CardDescription>Generate reports for large datasets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Breakdown Level</Label>
                        <Select value={level} onValueChange={setLevel}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="campaign">Campaign</SelectItem>
                                <SelectItem value="adset">Ad Set</SelectItem>
                                <SelectItem value="ad">Ad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Optional Breakdowns</Label>
                        <div className="flex flex-wrap gap-2">
                            {['age', 'gender', 'country', 'impression_device'].map(b => (
                                <Badge
                                    key={b}
                                    variant={breakdowns.includes(b) ? "default" : "outline"}
                                    onClick={() => toggleBreakdown(b)}
                                    className="cursor-pointer select-none"
                                >
                                    {b}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {status && (
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">Status: {status}</span>
                                <span className="text-muted-foreground">{progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <Button onClick={startReport} disabled={isLoading || status === 'Job Started' || status === 'Job Running'} className="w-full gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart className="w-4 h-4" />}
                        {status === 'Job Completed' || status.includes('Job Failed') ? 'Run New Report' : 'Start Report Run'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Report Results</CardTitle>
                    <CardDescription>{results.length > 0 ? `${results.length} rows retrieved` : 'No data available'}</CardDescription>
                </CardHeader>
                <CardContent>
                    {results.length > 0 ? (
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {results.map((row, i) => (
                                <div key={i} className="p-3 bg-muted rounded-lg text-sm">
                                    <div className="font-medium">{row.campaign_name || row.adset_name || row.ad_name}</div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                        <div>Spend: ${row.spend}</div>
                                        <div>Impr: {row.impressions}</div>
                                        <div>Clicks: {row.clicks}</div>
                                        {breakdowns.map(b => row[b] && (
                                            <div key={b} className="capitalize text-indigo-500 font-medium run-in">
                                                {b}: {row[b]}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Run a report to view insights
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
