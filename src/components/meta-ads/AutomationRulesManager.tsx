'use client';

import React, { useState, useEffect } from 'react';
import {
    Zap,
    Plus,
    Play,
    Pause,
    Trash2,
    Edit,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    Settings,
    Bell,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Clock,
    Target,
    BarChart3,
    Copy,
    History,
    X,
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// Rule execution types with icons - per Meta Ad Rules Engine v24.0 docs
const EXECUTION_TYPES = [
    { value: 'PAUSE', label: 'Pause', icon: Pause, color: 'text-yellow-500' },
    { value: 'UNPAUSE', label: 'Activate', icon: Play, color: 'text-green-500' },
    { value: 'CHANGE_BUDGET', label: 'Adjust Budget', icon: DollarSign, color: 'text-blue-500' },
    { value: 'CHANGE_BID', label: 'Adjust Bid', icon: TrendingUp, color: 'text-cyan-500' },
    { value: 'NOTIFICATION', label: 'Send Alert', icon: Bell, color: 'text-purple-500' },
    { value: 'REBALANCE_BUDGET', label: 'Rebalance', icon: BarChart3, color: 'text-orange-500' },
    { value: 'PING_ENDPOINT', label: 'Webhook', icon: Zap, color: 'text-pink-500' },
];

// Available metrics for conditions
const RULE_FIELDS = [
    { value: 'ctr', label: 'CTR (%)', category: 'Performance' },
    { value: 'cpc', label: 'CPC ($)', category: 'Performance' },
    { value: 'cpm', label: 'CPM ($)', category: 'Performance' },
    { value: 'impressions', label: 'Impressions', category: 'Performance' },
    { value: 'clicks', label: 'Clicks', category: 'Performance' },
    { value: 'conversions', label: 'Conversions', category: 'Conversions' },
    { value: 'cost_per_conversion', label: 'Cost/Conversion ($)', category: 'Conversions' },
    { value: 'roas', label: 'ROAS', category: 'Conversions' },
    { value: 'spent', label: 'Total Spend ($)', category: 'Budget' },
    { value: 'daily_spend', label: 'Daily Spend ($)', category: 'Budget' },
    { value: 'frequency', label: 'Frequency', category: 'Delivery' },
    { value: 'reach', label: 'Reach', category: 'Delivery' },
];

const OPERATORS = [
    { value: 'GREATER_THAN', label: 'Greater than' },
    { value: 'LESS_THAN', label: 'Less than' },
    { value: 'EQUAL', label: 'Equals' },
    { value: 'NOT_EQUAL', label: 'Not equals' },
    { value: 'IN_RANGE', label: 'In range' },
    { value: 'NOT_IN_RANGE', label: 'Not in range' },
];

// Evaluation types - per Meta Ad Rules Engine docs
const EVALUATION_TYPES = [
    { value: 'SCHEDULE', label: 'Schedule-based', description: 'Check at set time intervals' },
    { value: 'TRIGGER', label: 'Trigger-based', description: 'Check when metrics change' },
];

// Time presets for insights filters - supported by both trigger and schedule rules
const TIME_PRESETS = [
    { value: 'TODAY', label: 'Today' },
    { value: 'YESTERDAY', label: 'Yesterday' },
    { value: 'LAST_3D', label: 'Last 3 days' },
    { value: 'LAST_7D', label: 'Last 7 days' },
    { value: 'LAST_14D', label: 'Last 14 days' },
    { value: 'LAST_30D', label: 'Last 30 days' },
    { value: 'LIFETIME', label: 'Lifetime' },
];

interface AutomationRule {
    id: string;
    name: string;
    description?: string;
    entity_type: string;
    execution_type: string;
    status: string;
    conditions: Array<{
        field: string;
        operator: string;
        value: number | string;
    }>;
    executions_count?: number;
    last_execution?: string;
}

interface RuleTemplate {
    name: string;
    description: string;
    entity_type: string;
    conditions: Array<{ field: string; operator: string; value: number }>;
    execution_type: string;
    execution_options?: any;
}

interface AutomationRulesManagerProps {
    onRefresh?: () => void;
}

export default function AutomationRulesManager({ onRefresh }: AutomationRulesManagerProps) {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [templates, setTemplates] = useState<RuleTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);
    const [historyRuleId, setHistoryRuleId] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

    // Form state - per Meta Ad Rules Engine v24.0 docs
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        entity_type: 'CAMPAIGN',
        evaluation_type: 'SCHEDULE', // SCHEDULE or TRIGGER
        time_preset: 'LAST_7D', // For insights filters
        conditions: [{ field: 'ctr', operator: 'LESS_THAN', value: 1.0 }],
        execution_type: 'PAUSE',
        execution_options: {
            execution_count_limit: null as number | null,
            action_frequency: null as number | null,
            // For CHANGE_BUDGET
            budget_change_type: 'INCREASE_BY',
            budget_change_value: 20,
            budget_change_unit: 'PERCENT',
            // For NOTIFICATION
            user_ids: [] as string[],
            // For PING_ENDPOINT
            endpoint_url: '',
        },
        schedule: {
            schedule_type: 'DAILY',
            start_minute: 0,
            end_minute: 1439,
            days: [0, 1, 2, 3, 4, 5, 6], // All days
        },
        status: 'ENABLED',
    });

    useEffect(() => {
        fetchRules();
        fetchTemplates();
    }, []);

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/v1/meta-ads/rules');
            if (response.ok) {
                const data = await response.json();
                setRules(data.rules || []);
            }
        } catch (err) {
            console.error('Failed to fetch rules:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await fetch('/api/v1/meta-ads/rules/templates');
            if (response.ok) {
                const data = await response.json();
                if (data.templates && data.templates.length > 0) {
                    setTemplates(data.templates);
                } else {
                    // Use local defaults if API returns empty
                    setTemplates(getDefaultTemplates());
                }
            } else {
                setTemplates(getDefaultTemplates());
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
            setTemplates(getDefaultTemplates());
        }
    };

    const getDefaultTemplates = () => [
        {
            name: 'Pause Low Performers',
            description: 'Pause ads with CTR below 1% after 1000 impressions',
            entity_type: 'AD',
            conditions: [
                { field: 'ctr', operator: 'LESS_THAN', value: 1.0 },
                { field: 'impressions', operator: 'GREATER_THAN', value: 1000 }
            ],
            execution_type: 'PAUSE'
        },
        {
            name: 'Alert High Spend',
            description: 'Notify when daily spend exceeds $100',
            entity_type: 'CAMPAIGN',
            conditions: [{ field: 'spent', operator: 'GREATER_THAN', value: 10000 }],
            execution_type: 'NOTIFICATION'
        },
        {
            name: 'Scale Winners',
            description: 'Increase budget 20% for campaigns with ROAS > 3',
            entity_type: 'CAMPAIGN',
            conditions: [
                { field: 'roas', operator: 'GREATER_THAN', value: 3.0 },
                { field: 'spent', operator: 'GREATER_THAN', value: 5000 }
            ],
            execution_type: 'CHANGE_BUDGET'
        },
        {
            name: 'Limit Frequency',
            description: 'Pause ad sets with frequency > 3',
            entity_type: 'ADSET',
            conditions: [{ field: 'frequency', operator: 'GREATER_THAN', value: 3.0 }],
            execution_type: 'PAUSE'
        },
        {
            name: 'Optimize Bids',
            description: 'Lower bid by 10% when CPC exceeds target',
            entity_type: 'ADSET',
            conditions: [{ field: 'cpc', operator: 'GREATER_THAN', value: 2.5 }],
            execution_type: 'CHANGE_BID'
        }
    ];

    const handleCreateRule = async () => {
        setIsCreating(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/meta-ads/rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setShowCreateModal(false);
                fetchRules();
                onRefresh?.();
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    entity_type: 'CAMPAIGN',
                    evaluation_type: 'SCHEDULE',
                    time_preset: 'LAST_7D',
                    conditions: [{ field: 'ctr', operator: 'LESS_THAN', value: 1.0 }],
                    execution_type: 'PAUSE',
                    schedule: {
                        schedule_type: 'DAILY',
                        start_minute: 0,
                        end_minute: 1439,
                        days: [0, 1, 2, 3, 4, 5, 6]
                    },
                    status: 'ENABLED',
                    execution_options: {
                        execution_count_limit: null,
                        action_frequency: null,
                        budget_change_type: 'INCREASE_BY',
                        budget_change_value: 20,
                        budget_change_unit: 'PERCENT',
                        user_ids: [],
                        endpoint_url: '',
                    },
                });
            } else {
                const data = await response.json();
                setError(data.detail || 'Failed to create rule');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleRule = async (ruleId: string, currentStatus: string) => {
        setUpdatingRuleId(ruleId);
        try {
            const newStatus = currentStatus === 'ENABLED' ? 'DISABLED' : 'ENABLED';
            const response = await fetch(`/api/v1/meta-ads/rules/${ruleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setRules(rules.map(r =>
                    r.id === ruleId ? { ...r, status: newStatus } : r
                ));
            }
        } catch (err) {
            console.error('Failed to toggle rule:', err);
        } finally {
            setUpdatingRuleId(null);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            const response = await fetch(`/api/v1/meta-ads/rules/${ruleId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setRules(rules.filter(r => r.id !== ruleId));
                onRefresh?.();
            }
        } catch (err) {
            console.error('Failed to delete rule:', err);
        }
    };

    const handleUseTemplate = (template: RuleTemplate) => {
        setFormData({
            name: template.name,
            description: template.description,
            entity_type: template.entity_type,
            evaluation_type: 'SCHEDULE',
            time_preset: 'LAST_7D',
            conditions: template.conditions,
            execution_type: template.execution_type,
            schedule: {
                schedule_type: 'DAILY',
                start_minute: 0,
                end_minute: 1439,
                days: [0, 1, 2, 3, 4, 5, 6]
            },
            status: 'ENABLED',
            execution_options: {
                execution_count_limit: null,
                action_frequency: null,
                budget_change_type: 'INCREASE_BY',
                budget_change_value: 20,
                budget_change_unit: 'PERCENT',
                user_ids: [],
                endpoint_url: '',
            },
        });
        setShowTemplates(false);
        setShowCreateModal(true);
    };

    const addCondition = () => {
        setFormData({
            ...formData,
            conditions: [...formData.conditions, { field: 'impressions', operator: 'GREATER_THAN', value: 1000 }],
        });
    };

    const removeCondition = (index: number) => {
        setFormData({
            ...formData,
            conditions: formData.conditions.filter((_, i) => i !== index),
        });
    };

    const updateCondition = (index: number, field: string, value: any) => {
        const newConditions = [...formData.conditions];
        newConditions[index] = { ...newConditions[index], [field]: value };
        setFormData({ ...formData, conditions: newConditions });
    };

    const getExecutionIcon = (executionType: string) => {
        const found = EXECUTION_TYPES.find(e => e.value === executionType);
        if (found) {
            const Icon = found.icon;
            return <Icon className={cn('w-4 h-4', found.color)} />;
        }
        return <Settings className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Header - Clean & Professional */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                            <Zap className="w-4 h-4" />
                        </div>
                        Automation Rules
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Automate campaign management with rules</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                        onClick={() => setShowTemplates(true)}
                    >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Templates</span>
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 gap-2 text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Rule</span>
                    </Button>
                </div>
            </div>

            {/* Rules List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : rules.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Zap className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="font-semibold text-lg mb-2">No Automation Rules Yet</h3>
                        <p className="text-muted-foreground text-center max-w-md mb-4">
                            Create rules to automatically manage your campaigns based on performance.
                        </p>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowTemplates(true)} className="gap-2">
                                <Copy className="w-4 h-4" />
                                Use Template
                            </Button>
                            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Create Rule
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {rules.map((rule) => (
                        <Card key={rule.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-muted">
                                            {getExecutionIcon(rule.execution_type)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold flex items-center gap-2">
                                                {rule.name}
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
                                                    rule.status === 'ENABLED'
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                )}>
                                                    {rule.status === 'ENABLED' ? 'Active' : 'Disabled'}
                                                </span>
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {rule.description || `${rule.entity_type} • ${rule.conditions?.length || 0} condition(s)`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={rule.status === 'ENABLED'}
                                            onCheckedChange={() => handleToggleRule(rule.id, rule.status)}
                                            disabled={updatingRuleId === rule.id}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setHistoryRuleId(rule.id)}
                                            title="View History"
                                        >
                                            <History className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingRule(rule)}
                                            title="Edit Rule"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Conditions preview */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {rule.conditions?.map((condition, idx) => (
                                        <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                            {condition.field} {condition.operator.replace('_', ' ').toLowerCase()} {condition.value}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border-0">
                        <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                            <CardTitle className="flex items-center gap-2 text-lg text-white">
                                <Copy className="w-5 h-5" />
                                Rule Templates
                            </CardTitle>
                            <CardDescription className="text-sm text-white/80">
                                Start with a pre-built template
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[50vh] overflow-y-auto scrollbar-hide p-3 space-y-2">
                            {templates.map((template, idx) => {
                                const actionIcon = EXECUTION_TYPES.find(e => e.value === template.execution_type);
                                const ActionIcon = actionIcon?.icon || Settings;
                                const iconColor = actionIcon?.color || 'text-gray-500';

                                return (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-lg border bg-card cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
                                        onClick={() => handleUseTemplate(template)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg shrink-0",
                                                template.execution_type === 'PAUSE' ? "bg-yellow-100 dark:bg-yellow-900/30" :
                                                    template.execution_type === 'SEND_NOTIFICATION' ? "bg-purple-100 dark:bg-purple-900/30" :
                                                        template.execution_type === 'CHANGE_BUDGET' ? "bg-blue-100 dark:bg-blue-900/30" :
                                                            "bg-green-100 dark:bg-green-900/30"
                                            )}>
                                                <ActionIcon className={cn("w-4 h-4", iconColor)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-sm">{template.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                                                        {template.entity_type}
                                                    </span>
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium dark:bg-amber-900/30 dark:text-amber-400">
                                                        {template.execution_type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                        <CardFooter className="p-3 border-t bg-muted/30">
                            <Button variant="outline" onClick={() => setShowTemplates(false)} className="w-full h-9">
                                Cancel
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border-0">
                        <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                            <CardTitle className="flex items-center gap-2 text-lg text-white">
                                <Zap className="w-5 h-5" />
                                Create Automation Rule
                            </CardTitle>
                            <CardDescription className="text-white/80 text-sm">
                                Define conditions and actions for automatic campaign management
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-y-auto scrollbar-hide p-4 space-y-4">
                            <div>
                                <Label htmlFor="ruleName" className="text-xs font-medium">Rule Name</Label>
                                <Input
                                    id="ruleName"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Pause Low CTR Ads"
                                    className="mt-1.5 h-9"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-medium">Apply To</Label>
                                <Select
                                    value={formData.entity_type}
                                    onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
                                >
                                    <SelectTrigger className="mt-1.5 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CAMPAIGN">Campaigns</SelectItem>
                                        <SelectItem value="ADSET">Ad Sets</SelectItem>
                                        <SelectItem value="AD">Ads</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Evaluation Type & Time Preset */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-medium">Evaluation Type</Label>
                                    <Select
                                        value={formData.evaluation_type}
                                        onValueChange={(v) => setFormData({ ...formData, evaluation_type: v })}
                                    >
                                        <SelectTrigger className="mt-1.5 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EVALUATION_TYPES.map(et => (
                                                <SelectItem key={et.value} value={et.value}>
                                                    {et.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs font-medium">Time Range</Label>
                                    <Select
                                        value={formData.time_preset}
                                        onValueChange={(v) => setFormData({ ...formData, time_preset: v })}
                                    >
                                        <SelectTrigger className="mt-1.5 h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIME_PRESETS.map(tp => (
                                                <SelectItem key={tp.value} value={tp.value}>
                                                    {tp.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Conditions */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs font-medium">Conditions</Label>
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addCondition}>
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {formData.conditions.map((condition, idx) => (
                                        <div key={idx} className="flex gap-1.5 items-center">
                                            <Select
                                                value={condition.field}
                                                onValueChange={(v) => updateCondition(idx, 'field', v)}
                                            >
                                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {RULE_FIELDS.map(f => (
                                                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select
                                                value={condition.operator}
                                                onValueChange={(v) => updateCondition(idx, 'operator', v)}
                                            >
                                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {OPERATORS.map(o => (
                                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                value={condition.value}
                                                onChange={(e) => updateCondition(idx, 'value', parseFloat(e.target.value) || 0)}
                                                className="w-16 h-8 text-xs"
                                            />
                                            {formData.conditions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => removeCondition(idx)}
                                                >
                                                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action */}
                            <div>
                                <Label className="text-xs font-medium">Action</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {EXECUTION_TYPES.map((exec) => {
                                        const Icon = exec.icon;
                                        return (
                                            <div
                                                key={exec.value}
                                                className={cn(
                                                    "p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2",
                                                    formData.execution_type === exec.value
                                                        ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm"
                                                        : "border-muted hover:border-amber-300 hover:bg-muted/50"
                                                )}
                                                onClick={() => setFormData({ ...formData, execution_type: exec.value })}
                                            >
                                                <Icon className={cn('w-4 h-4', exec.color)} />
                                                <span className="font-medium text-xs">{exec.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Execution Options - show based on selected action */}
                            {(formData.execution_type === 'CHANGE_BUDGET' || formData.execution_type === 'CHANGE_BID') && (
                                <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                                    <Label className="text-xs font-medium">
                                        {formData.execution_type === 'CHANGE_BUDGET' ? 'Budget' : 'Bid'} Change
                                    </Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Select
                                            value={formData.execution_options.budget_change_type}
                                            onValueChange={(v) => setFormData({
                                                ...formData,
                                                execution_options: { ...formData.execution_options, budget_change_type: v }
                                            })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INCREASE_BY">Increase by</SelectItem>
                                                <SelectItem value="DECREASE_BY">Decrease by</SelectItem>
                                                <SelectItem value="SET_TO">Set to</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            value={formData.execution_options.budget_change_value}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                execution_options: { ...formData.execution_options, budget_change_value: parseFloat(e.target.value) || 0 }
                                            })}
                                            className="h-8 text-xs"
                                        />
                                        <Select
                                            value={formData.execution_options.budget_change_unit}
                                            onValueChange={(v) => setFormData({
                                                ...formData,
                                                execution_options: { ...formData.execution_options, budget_change_unit: v }
                                            })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENT">%</SelectItem>
                                                <SelectItem value="ABSOLUTE">$</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {formData.execution_type === 'PING_ENDPOINT' && (
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <Label htmlFor="webhookUrl" className="text-xs font-medium">Webhook URL</Label>
                                    <Input
                                        id="webhookUrl"
                                        value={formData.execution_options.endpoint_url}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            execution_options: { ...formData.execution_options, endpoint_url: e.target.value }
                                        })}
                                        placeholder="https://your-webhook.com/endpoint"
                                        className="mt-1.5 h-9"
                                    />
                                </div>
                            )}

                            {/* Advanced Options */}
                            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                                <Label className="text-xs font-medium">Advanced Options</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Max Executions</Label>
                                        <Input
                                            type="number"
                                            value={formData.execution_options.execution_count_limit || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                execution_options: {
                                                    ...formData.execution_options,
                                                    execution_count_limit: e.target.value ? parseInt(e.target.value) : null
                                                }
                                            })}
                                            placeholder="Unlimited"
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground">Cooldown (mins)</Label>
                                        <Input
                                            type="number"
                                            value={formData.execution_options.action_frequency ? formData.execution_options.action_frequency / 60 : ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                execution_options: {
                                                    ...formData.execution_options,
                                                    action_frequency: e.target.value ? parseInt(e.target.value) * 60 : null
                                                }
                                            })}
                                            placeholder="No limit"
                                            className="h-8 text-xs mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs">{error}</span>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 p-3 border-t bg-muted/30">
                            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="h-9 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                                onClick={handleCreateRule}
                                disabled={isCreating || !formData.name}
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Rule'
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Edit Rule Modal */}
            {editingRule && (
                <EditRuleModal
                    rule={editingRule}
                    onClose={() => setEditingRule(null)}
                    onSave={() => {
                        setEditingRule(null);
                        fetchRules();
                        onRefresh?.();
                    }}
                />
            )}

            {/* Rule History Modal */}
            {historyRuleId && (
                <RuleHistoryModal
                    ruleId={historyRuleId}
                    onClose={() => setHistoryRuleId(null)}
                />
            )}
        </div>
    );
}

// Rule History Modal Component
function RuleHistoryModal({ ruleId, onClose }: { ruleId: string; onClose: () => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/v1/meta-ads/rules/${ruleId}/history`);
                if (response.ok) {
                    const data = await response.json();
                    setHistory(data.history || []);
                } else {
                    const err = await response.json();
                    setError(err.detail || 'Failed to load history');
                }
            } catch (err) {
                setError('Failed to load history');
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [ruleId]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border-0">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            <History className="w-5 h-5" />
                            Rule Execution History
                        </CardTitle>
                        <CardDescription className="text-white/80 text-sm">
                            Recent executions for this rule
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>
                <CardContent className="max-h-[50vh] overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No execution history found</p>
                            <p className="text-xs mt-1">The rule hasn't been triggered yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map((entry, idx) => (
                                <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {new Date(entry.time).toLocaleString()}
                                        </span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full",
                                            entry.is_manual
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-green-100 text-green-700"
                                        )}>
                                            {entry.is_manual ? 'Manual' : 'Scheduled'}
                                        </span>
                                    </div>
                                    {entry.exception_code && (
                                        <div className="text-xs text-red-500 mb-1">
                                            Error: {entry.exception_message || entry.exception_code}
                                        </div>
                                    )}
                                    {entry.results && entry.results.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {entry.results.length} object(s) affected
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Edit Rule Modal Component
function EditRuleModal({
    rule,
    onClose,
    onSave
}: {
    rule: AutomationRule;
    onClose: () => void;
    onSave: () => void;
}) {
    const [name, setName] = useState(rule.name);
    const [status, setStatus] = useState(rule.status);
    const [conditions, setConditions] = useState(rule.conditions || []);
    const [executionType, setExecutionType] = useState(rule.execution_type);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/v1/meta-ads/rules/${rule.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    status,
                    execution_spec: {
                        execution_type: executionType
                    }
                })
            });

            if (response.ok) {
                onSave();
            } else {
                const err = await response.json();
                setError(err.detail || 'Failed to update rule');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border-0">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg text-white">
                            <Edit className="w-5 h-5" />
                            Edit Rule
                        </CardTitle>
                        <CardDescription className="text-white/80 text-sm">
                            Modify rule settings
                        </CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                        <X className="w-5 h-5" />
                    </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div>
                        <Label htmlFor="editRuleName" className="text-xs font-medium">Rule Name</Label>
                        <Input
                            id="editRuleName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1.5 h-9"
                        />
                    </div>

                    <div>
                        <Label className="text-xs font-medium">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="mt-1.5 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ENABLED">Enabled</SelectItem>
                                <SelectItem value="DISABLED">Disabled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs font-medium">Action</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {EXECUTION_TYPES.map((exec) => {
                                const Icon = exec.icon;
                                return (
                                    <div
                                        key={exec.value}
                                        className={cn(
                                            "p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2",
                                            executionType === exec.value
                                                ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm"
                                                : "border-muted hover:border-amber-300 hover:bg-muted/50"
                                        )}
                                        onClick={() => setExecutionType(exec.value)}
                                    >
                                        <Icon className={cn('w-4 h-4', exec.color)} />
                                        <span className="font-medium text-xs">{exec.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Conditions display (read-only for now) */}
                    {conditions.length > 0 && (
                        <div>
                            <Label className="text-xs font-medium">Conditions</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {conditions.map((c, idx) => (
                                    <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                                        {c.field} {c.operator.replace('_', ' ').toLowerCase()} {c.value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">{error}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 p-3 border-t bg-muted/30">
                    <Button variant="outline" size="sm" className="h-9" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        className="h-9 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                        onClick={handleSave}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

