'use client';

import React, { useState, useEffect } from 'react';
import {
    FlaskConical,
    Plus,
    Play,
    Pause,
    Trash2,
    Trophy,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    BarChart3,
    Users,
    Image,
    Layout,
    Zap,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Test variables
const TEST_VARIABLES = [
    { value: 'AUDIENCE', label: 'Audience', icon: Users, description: 'Compare different target audiences' },
    { value: 'CREATIVE', label: 'Creative', icon: Image, description: 'Test different ad creatives' },
    { value: 'PLACEMENT', label: 'Placement', icon: Layout, description: 'Compare placement performance' },
    { value: 'DELIVERY_OPTIMIZATION', label: 'Optimization', icon: Zap, description: 'Test delivery strategies' },
];

interface ABTest {
    id: string;
    name: string;
    type?: string; // SPLIT_TEST or LIFT
    test_type?: string;
    test_variable?: string;
    description?: string;
    status: string; // DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELED
    cells: Array<{
        id?: string;
        name: string;
        treatment_percentage: number;
        campaigns?: string[];
        adsets?: string[];
        adaccounts?: string[];
        campaigns_count?: number;
        adsets_count?: number;
        results?: {
            spend: number;
            impressions: number;
            clicks: number;
            conversions: number;
            ctr: number;
            cost_per_result: number;
        };
    }>;
    objectives?: Array<{
        id: string;
        name: string;
        type: string;
        is_primary?: boolean;
    }>;
    start_time?: string;
    end_time?: string;
    observation_end_time?: string;
    cooldown_start_time?: string;
    created_time?: string;
    updated_time?: string;
    canceled_time?: string;
    cells_count?: number;
    confidence_level?: number;
    winning_cell?: string;
}

interface ABTestManagerProps {
    onRefresh?: () => void;
}

interface Campaign {
    id: string;
    name: string;
    status: string;
}

interface Business {
    id: string;
    name: string;
}

export default function ABTestManager({ onRefresh }: ABTestManagerProps) {
    const [tests, setTests] = useState<ABTest[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Results panel state
    const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [insights, setInsights] = useState<any[]>([]);
    const [winner, setWinner] = useState<string | null>(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        test_type: 'SPLIT_TEST',
        test_variable: 'CREATIVE',
        description: '',
        business_id: '', // Auto-fetched or selected
        cells: [
            { name: 'Group A', treatment_percentage: 50, campaigns: [] as string[] },
            { name: 'Group B', treatment_percentage: 50, campaigns: [] as string[] },
        ],
        start_time: undefined as number | undefined,
        end_time: undefined as number | undefined,
    });

    useEffect(() => {
        fetchCampaigns();
        fetchBusinesses();
    }, []);

    // Refetch tests when business_id changes
    useEffect(() => {
        if (formData.business_id) {
            fetchTests();
        }
    }, [formData.business_id]);

    const fetchTests = async () => {
        // Only fetch if we have a business_id
        if (!formData.business_id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`/api/v1/meta-ads/ab-tests?business_id=${formData.business_id}`);
            if (response.ok) {
                const data = await response.json();
                setTests(data.ab_tests || []);
            }
        } catch (err) {
            console.error('Failed to fetch A/B tests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const response = await fetch('/api/v1/meta-ads/campaigns');
            if (response.ok) {
                const data = await response.json();
                setCampaigns(data.campaigns || []);
            }
        } catch (err) {
            console.error('Failed to fetch campaigns:', err);
        }
    };

    const fetchBusinesses = async () => {
        try {
            const response = await fetch('/api/v1/meta-ads/businesses');
            if (response.ok) {
                const data = await response.json();
                const bizList = data.businesses || [];
                setBusinesses(bizList);
                // Auto-select first business if available
                if (bizList.length > 0 && !formData.business_id) {
                    setFormData(prev => ({ ...prev, business_id: bizList[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch businesses:', err);
        }
    };

    const handleCreateTest = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                test_type: formData.test_type,
                cells: formData.cells,
                start_time: formData.start_time,
                end_time: formData.end_time,
                business_id: formData.business_id || undefined, // Only include if provided
            };

            const response = await fetch('/api/v1/meta-ads/ab-tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowCreateModal(false);
                fetchTests();
                onRefresh?.();
            } else {
                const data = await response.json();
                // Handle both string errors and Pydantic validation error arrays
                let errorMessage = 'Failed to create test';
                if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                } else if (Array.isArray(data.detail)) {
                    // Pydantic validation errors come as array of {type, loc, msg, input}
                    errorMessage = data.detail.map((e: { msg?: string; loc?: string[] }) =>
                        e.msg || 'Validation error'
                    ).join(', ');
                } else if (data.detail?.msg) {
                    errorMessage = data.detail.msg;
                }
                setError(errorMessage);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
            case 'ON':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Play className="w-3 h-3" />
                        Active
                    </span>
                );
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                    </span>
                );
            case 'PAUSED':
            case 'OFF':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Pause className="w-3 h-3" />
                        Paused
                    </span>
                );
            case 'SCHEDULED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        <Clock className="w-3 h-3" />
                        Scheduled
                    </span>
                );
            case 'CANCELED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        Canceled
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        Draft
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {status || 'Unknown'}
                    </span>
                );
        }
    };

    const getVariableIcon = (variable: string) => {
        const found = TEST_VARIABLES.find(v => v.value === variable);
        if (found) {
            const Icon = found.icon;
            return <Icon className="w-4 h-4" />;
        }
        return <FlaskConical className="w-4 h-4" />;
    };

    // Fetch insights for a test
    const handleViewResults = async (test: ABTest) => {
        setSelectedTest(test);
        setShowResultsModal(true);
        setIsLoadingInsights(true);

        try {
            const response = await fetch(`/api/v1/meta-ads/ab-tests/${test.id}/insights`);
            if (response.ok) {
                const data = await response.json();
                setInsights(data.insights || []);
                setWinner(data.winner);
            }
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        } finally {
            setIsLoadingInsights(false);
        }
    };

    // Pause or Resume a test
    const handleToggleStatus = async (test: ABTest) => {
        const newStatus = test.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        setActionLoading(test.id);

        try {
            const response = await fetch(`/api/v1/meta-ads/ab-tests/${test.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                fetchTests();
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Duplicate a test
    const handleDuplicate = async (test: ABTest) => {
        setActionLoading(`dup-${test.id}`);

        try {
            const response = await fetch(`/api/v1/meta-ads/ab-tests/${test.id}/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: `${test.name} (Copy)` }),
            });

            if (response.ok) {
                fetchTests();
            }
        } catch (err) {
            console.error('Failed to duplicate:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Cancel/Delete a test
    const handleCancel = async (test: ABTest) => {
        if (!confirm(`Are you sure you want to cancel "${test.name}"? This action cannot be undone.`)) {
            return;
        }

        setActionLoading(`del-${test.id}`);

        try {
            const response = await fetch(`/api/v1/meta-ads/ab-tests/${test.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchTests();
            }
        } catch (err) {
            console.error('Failed to cancel:', err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FlaskConical className="w-6 h-6 text-purple-500" />
                        A/B Testing
                    </h2>
                    <p className="text-muted-foreground">Create and manage split tests</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                    <Plus className="w-4 h-4" />
                    Create A/B Test
                </Button>
            </div>

            {/* Tests Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : tests.length === 0 ? (
                <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-slate-900 dark:via-purple-900/10 dark:to-pink-900/10">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse" />
                            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200/50 dark:border-purple-500/20">
                                <FlaskConical className="w-12 h-12 text-purple-500" />
                            </div>
                        </div>
                        <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            No A/B Tests Yet
                        </h3>
                        <p className="text-muted-foreground text-center max-w-md mb-6 leading-relaxed">
                            Create your first A/B test to compare different ad strategies, audiences, or creatives and discover what works best for your campaigns.
                        </p>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Test
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tests.map((test, testIdx) => (
                        <Card key={test.id} className="group overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-900">
                            {/* Simple Status Border */}
                            <div className={`h-1 w-full ${test.status === 'ACTIVE' ? 'bg-green-500' :
                                test.status === 'COMPLETED' ? 'bg-blue-500' :
                                    test.status === 'SCHEDULED' ? 'bg-purple-500' :
                                        test.status === 'CANCELED' ? 'bg-red-500' :
                                            'bg-slate-300'
                                }`} />

                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                <FlaskConical className="w-4 h-4" />
                                            </div>
                                            <CardTitle className="text-lg font-medium truncate">{test.name}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>
                                                {test.type === 'LIFT' ? 'Lift Study' : 'Split Test'}
                                            </span>
                                            <span>•</span>
                                            <span>{test.cells?.length || 0} groups</span>
                                        </div>
                                    </div>
                                    {getStatusBadge(test.status)}
                                </div>

                                {/* Date Range */}
                                {(test.start_time || test.end_time) && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {test.start_time && new Date(test.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            {test.start_time && test.end_time && ' → '}
                                            {test.end_time && new Date(test.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="pt-0">
                                {/* Visual Cell Comparison */}
                                <div className="space-y-3">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                        Traffic Split
                                    </div>

                                    {/* Horizontal Bar Comparison - Simple Colors */}
                                    <div className="relative h-6 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
                                        {test.cells?.map((cell, idx) => {
                                            const bgColors = [
                                                'bg-slate-300 dark:bg-slate-600',
                                                'bg-slate-400 dark:bg-slate-500',
                                                'bg-slate-500 dark:bg-slate-400'
                                            ];
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`${bgColors[idx % bgColors.length]} flex items-center justify-center text-white text-[10px] font-medium transition-all duration-500 border-r border-white/20 last:border-0`}
                                                    style={{ width: `${cell.treatment_percentage}%` }}
                                                >
                                                    {cell.treatment_percentage >= 20 && `${cell.treatment_percentage}%`}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Cell Labels */}
                                    <div className="flex flex-wrap gap-2">
                                        {test.cells?.map((cell, idx) => {
                                            return (
                                                <div key={idx} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-md px-2 py-1 border border-slate-100 dark:border-slate-800">
                                                    <span className="font-medium">{cell.name}</span>
                                                    {test.winning_cell === cell.name && (
                                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                    {(cell.campaigns_count || cell.adsets_count) ? (
                                                        <span className="text-muted-foreground ml-1">
                                                            ({cell.campaigns_count || 0}c, {cell.adsets_count || 0}a)
                                                        </span>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Objectives if available */}
                                    {test.objectives && test.objectives.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                                            <span className="text-muted-foreground">Objective:</span>
                                            <span className="font-medium">{test.objectives[0]?.name || 'Conversions'}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="pt-3 pb-3 flex gap-2 border-t bg-slate-50/50 dark:bg-slate-900/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-8 text-xs hover:bg-white hover:shadow-sm"
                                    onClick={() => handleViewResults(test)}
                                >
                                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                                    Results
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleToggleStatus(test)}
                                    disabled={actionLoading === test.id || test.status === 'COMPLETED' || test.status === 'CANCELED'}
                                >
                                    {actionLoading === test.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : test.status === 'ACTIVE' ? (
                                        <Pause className="w-3.5 h-3.5" />
                                    ) : (
                                        <Play className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleDuplicate(test)}
                                    disabled={actionLoading === `dup-${test.id}`}
                                >
                                    {actionLoading === `dup-${test.id}` ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:text-red-500"
                                    onClick={() => handleCancel(test)}
                                    disabled={actionLoading === `del-${test.id}` || test.status === 'CANCELED'}
                                >
                                    {actionLoading === `del-${test.id}` ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-500" />
                                Create A/B Test
                            </CardTitle>
                            <CardDescription>
                                Compare different ad strategies to optimize performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="testName">Test Name</Label>
                                <Input
                                    id="testName"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Holiday Creative Test"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Test Variable</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {TEST_VARIABLES.map((variable) => {
                                        const Icon = variable.icon;
                                        return (
                                            <div
                                                key={variable.value}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition-all",
                                                    formData.test_variable === variable.value
                                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                                                        : "border-muted hover:border-purple-300"
                                                )}
                                                onClick={() => setFormData({ ...formData, test_variable: variable.value })}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4 text-purple-500" />
                                                    <span className="font-medium text-sm">{variable.label}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Test video vs image creatives"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Business Account</Label>
                                <Select
                                    value={formData.business_id}
                                    onValueChange={(value) => setFormData({ ...formData, business_id: value === 'ad_account' ? '' : value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select business account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ad_account">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                Use Ad Account (Default)
                                            </div>
                                        </SelectItem>
                                        {businesses.map((biz) => (
                                            <SelectItem key={biz.id} value={biz.id}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                                    {biz.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {businesses.length === 0 ? 'Loading businesses...' : 'Select your Business Manager for cross-account studies'}
                                </p>
                            </div>

                            {/* Test Cells Configuration */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Test Cells (Groups)</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (formData.cells.length < 5) {
                                                setFormData({
                                                    ...formData,
                                                    cells: [
                                                        ...formData.cells,
                                                        {
                                                            name: `Group ${String.fromCharCode(65 + formData.cells.length)}`,
                                                            treatment_percentage: Math.floor(100 / (formData.cells.length + 1)),
                                                            campaigns: []
                                                        }
                                                    ]
                                                });
                                            }
                                        }}
                                        disabled={formData.cells.length >= 5}
                                        className="gap-1 text-xs h-7"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Cell
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {formData.cells.map((cell, idx) => (
                                        <div key={idx} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Input
                                                    value={cell.name}
                                                    onChange={(e) => {
                                                        const newCells = [...formData.cells];
                                                        newCells[idx].name = e.target.value;
                                                        setFormData({ ...formData, cells: newCells });
                                                    }}
                                                    placeholder={`Group ${String.fromCharCode(65 + idx)}`}
                                                    className="flex-1 h-8 text-sm"
                                                />
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={99}
                                                        value={cell.treatment_percentage}
                                                        onChange={(e) => {
                                                            const newCells = [...formData.cells];
                                                            newCells[idx].treatment_percentage = parseInt(e.target.value) || 0;
                                                            setFormData({ ...formData, cells: newCells });
                                                        }}
                                                        className="w-16 h-8 text-sm text-center"
                                                    />
                                                    <span className="text-xs text-muted-foreground">%</span>
                                                </div>
                                                {formData.cells.length > 2 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newCells = formData.cells.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, cells: newCells });
                                                        }}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div>
                                                <Select
                                                    value={cell.campaigns[0] || ''}
                                                    onValueChange={(value) => {
                                                        const newCells = [...formData.cells];
                                                        if (value) {
                                                            // Toggle: add if not exists, keep only one for now
                                                            newCells[idx].campaigns = [value];
                                                        } else {
                                                            newCells[idx].campaigns = [];
                                                        }
                                                        setFormData({ ...formData, cells: newCells });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select a campaign" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {campaigns.length === 0 ? (
                                                            <SelectItem value="-" disabled>No campaigns available</SelectItem>
                                                        ) : (
                                                            campaigns.map((campaign) => (
                                                                <SelectItem key={campaign.id} value={campaign.id}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "w-2 h-2 rounded-full",
                                                                            campaign.status === 'ACTIVE' ? "bg-green-500" : "bg-yellow-500"
                                                                        )} />
                                                                        <span className="truncate">{campaign.name}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Treatment percentage total indicator */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Total allocation:</span>
                                    <span className={cn(
                                        "font-medium",
                                        formData.cells.reduce((sum, c) => sum + c.treatment_percentage, 0) === 100
                                            ? "text-green-600"
                                            : "text-red-500"
                                    )}>
                                        {formData.cells.reduce((sum, c) => sum + c.treatment_percentage, 0)}%
                                        {formData.cells.reduce((sum, c) => sum + c.treatment_percentage, 0) !== 100 && " (should be 100%)"}
                                    </span>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="startTime">Start Date (Optional)</Label>
                                    <Input
                                        id="startTime"
                                        type="datetime-local"
                                        value={formData.start_time ? new Date(formData.start_time * 1000).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : undefined })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endTime">End Date</Label>
                                    <Input
                                        id="endTime"
                                        type="datetime-local"
                                        value={formData.end_time ? new Date(formData.end_time * 1000).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setFormData({ ...formData, end_time: Math.floor(new Date(e.target.value).getTime() / 1000) })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateTest}
                                disabled={isCreating || !formData.name}
                                className="bg-gradient-to-r from-purple-500 to-pink-600"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Test'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Results Modal */}
            {showResultsModal && selectedTest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-500" />
                                        {selectedTest.name} - Results
                                    </CardTitle>
                                    <CardDescription>
                                        Performance metrics and winner analysis
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowResultsModal(false)}
                                >
                                    <XCircle className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {isLoadingInsights ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {/* Winner Banner */}
                                    {winner && (
                                        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-6 h-6 text-yellow-500" />
                                                <div>
                                                    <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Winner Detected</p>
                                                    <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300">{winner}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Performance Comparison */}
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Cell Performance</h4>

                                        {selectedTest.cells?.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No cells configured for this test.</p>
                                        ) : (
                                            <div className="grid gap-4">
                                                {/* Merge insights with test cells for proper display */}
                                                {selectedTest.cells?.map((cell, idx) => {
                                                    // Try to find matching insight data
                                                    const insightData = insights.find(i =>
                                                        i.cell_id === cell.id ||
                                                        i.name === cell.name ||
                                                        i.id === cell.id
                                                    ) || insights[idx] || {};

                                                    return (
                                                        <div key={cell.id || idx} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                                                            {/* Simple header */}
                                                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                                                                    <span className="font-semibold">{cell.name || `Cell ${idx + 1}`}</span>
                                                                    {winner === cell.name && <Trophy className="w-4 h-4 text-yellow-500" />}
                                                                </div>
                                                                <span className="text-xs font-medium px-2 py-1 bg-white dark:bg-slate-800 rounded border">
                                                                    {cell.treatment_percentage || 0}% traffic
                                                                </span>
                                                            </div>

                                                            <div className="p-4">
                                                                {/* Metrics Grid */}
                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                        <p className="text-xs text-muted-foreground mb-1">Spend</p>
                                                                        <p className="text-lg font-semibold">${insightData.spend?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                        <p className="text-xs text-muted-foreground mb-1">Impressions</p>
                                                                        <p className="text-lg font-semibold">{insightData.impressions?.toLocaleString() || '0'}</p>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                        <p className="text-xs text-muted-foreground mb-1">CTR</p>
                                                                        <p className="text-lg font-semibold flex items-center gap-1">
                                                                            {insightData.ctr?.toFixed(2) || '0.00'}%
                                                                        </p>
                                                                    </div>
                                                                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                                        <p className="text-xs text-muted-foreground mb-1">Cost/Result</p>
                                                                        <p className="text-lg font-semibold">${insightData.cost_per_result?.toFixed(2) || '0.00'}</p>
                                                                    </div>
                                                                </div>

                                                                {/* Simple CTR Bar */}
                                                                <div className="mt-4 flex items-center gap-3 text-xs">
                                                                    <span className="text-muted-foreground w-8">CTR</span>
                                                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-slate-600 dark:bg-slate-400 rounded-full"
                                                                            style={{ width: `${Math.min((insightData.ctr || 0) * 10, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="font-medium w-10 text-right">{insightData.ctr?.toFixed(2) || '0'}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Test Info - Simplified */}
                                    <div className="pt-6 border-t">
                                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-4">Test Details</h4>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                                {getStatusBadge(selectedTest.status)}
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Type</p>
                                                <p className="font-medium">{selectedTest.type === 'LIFT' ? 'Lift Study' : 'Split Test'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Total Groups</p>
                                                <p className="font-medium">{selectedTest.cells_count || selectedTest.cells?.length || 0}</p>
                                            </div>
                                            {selectedTest.objectives && selectedTest.objectives[0] && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Objective</p>
                                                    <p className="font-medium">{selectedTest.objectives[0].name}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-dashed">
                                            <div className="flex flex-wrap gap-8 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                                                    <p className="font-medium">
                                                        {selectedTest.start_time
                                                            ? new Date(selectedTest.start_time).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })
                                                            : 'Not set'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">End Date</p>
                                                    <p className="font-medium">
                                                        {selectedTest.end_time
                                                            ? new Date(selectedTest.end_time).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })
                                                            : 'Not set'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Created</p>
                                                    <p className="font-medium">
                                                        {selectedTest.created_time
                                                            ? new Date(selectedTest.created_time).toLocaleDateString()
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowResultsModal(false)}>
                                Close
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
