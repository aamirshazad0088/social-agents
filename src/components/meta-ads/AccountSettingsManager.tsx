'use client';

import React, { useState, useEffect } from 'react';
import {
    Settings,
    DollarSign,
    Clock,
    Building2,
    Users,
    Bell,
    CreditCard,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Globe,
    Calendar,
    Edit2,
    Save,
    X,
    RefreshCw,
    ChevronRight,
    Activity,
    Zap,
    Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AccountSettingsManagerProps {
    onRefresh?: () => void;
}

interface AccountSettings {
    id: string;
    name: string;
    account_id: string;
    account_status: number;
    currency: string;
    timezone_name: string;
    timezone_id: number;
    spend_cap: number | null;
    amount_spent: string;
    balance: string;
    business_name?: string;
    business_city?: string;
    business_country_code?: string;
    created_time: string;
    is_personal: boolean;
    min_daily_budget: number;
    spend_cap_formatted?: string;
    amount_spent_formatted?: string;
    balance_formatted?: string;
}

interface TeamMember {
    id: string;
    name: string;
    role: string;
    permissions: string[];
}

const ACCOUNT_STATUS_MAP: Record<number, { label: string; color: string }> = {
    1: { label: 'Active', color: 'text-green-600 bg-green-50' },
    2: { label: 'Disabled', color: 'text-red-600 bg-red-50' },
    3: { label: 'Unsettled', color: 'text-amber-600 bg-amber-50' },
    7: { label: 'Pending Review', color: 'text-blue-600 bg-blue-50' },
    8: { label: 'Pending Closure', color: 'text-orange-600 bg-orange-50' },
    9: { label: 'In Grace Period', color: 'text-purple-600 bg-purple-50' },
    100: { label: 'Pending Risk Review', color: 'text-yellow-600 bg-yellow-50' },
    101: { label: 'Pending Settlement', color: 'text-cyan-600 bg-cyan-50' },
    201: { label: 'Any Active', color: 'text-green-600 bg-green-50' },
    202: { label: 'Any Closed', color: 'text-slate-600 bg-slate-50' },
};

export default function AccountSettingsManager({ onRefresh }: AccountSettingsManagerProps) {
    const [settings, setSettings] = useState<AccountSettings | null>(null);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [pixels, setPixels] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editSpendCap, setEditSpendCap] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [settingsRes, teamRes, notificationsRes, pixelsRes, activitiesRes] = await Promise.all([
                fetch('/api/v1/meta-ads/accounts/settings'),
                fetch('/api/v1/meta-ads/team/access'),
                fetch('/api/v1/meta-ads/notifications/settings'),
                fetch('/api/v1/meta-ads/accounts/pixels'),
                fetch('/api/v1/meta-ads/accounts/activities?limit=10'),
            ]);

            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data);
                setEditName(data.name || '');
                setEditSpendCap(data.spend_cap ? data.spend_cap / 100 : null);
            }

            if (teamRes.ok) {
                const data = await teamRes.json();
                setTeam(data.users || []);
            }

            if (notificationsRes.ok) {
                const data = await notificationsRes.json();
                setNotifications(data.notification_rules || []);
            }

            if (pixelsRes.ok) {
                const data = await pixelsRes.json();
                setPixels(data.pixels || []);
            }

            if (activitiesRes.ok) {
                const data = await activitiesRes.json();
                setActivities(data.activities || []);
            }
        } catch (err) {
            setError('Failed to load account settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            const response = await fetch('/api/v1/meta-ads/accounts/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editName !== settings.name ? editName : undefined,
                    spend_cap: editSpendCap,
                }),
            });

            if (response.ok) {
                await fetchSettings();
                setIsEditing(false);
                onRefresh?.();
            } else {
                const err = await response.json();
                setError(err.detail || 'Failed to update settings');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const accountStatus = settings?.account_status ? ACCOUNT_STATUS_MAP[settings.account_status] : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Ad Account Settings</h2>
                        <p className="text-xs text-muted-foreground">Manage your Meta ad account configuration</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSettings}>
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Overview */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-teal-500" />
                                Account Overview
                            </CardTitle>
                            {!isEditing ? (
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                    Edit
                                </Button>
                            ) : (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                        Save
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Account Name */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Account Name</Label>
                            {isEditing ? (
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="mt-1 h-9"
                                />
                            ) : (
                                <p className="text-sm font-medium mt-0.5">{settings?.name || 'N/A'}</p>
                            )}
                        </div>

                        {/* Account ID */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Account ID</Label>
                            <p className="text-sm font-mono mt-0.5">{settings?.account_id || settings?.id}</p>
                        </div>

                        {/* Status */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Status</Label>
                            <div className="mt-0.5">
                                {accountStatus && (
                                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", accountStatus.color)}>
                                        {accountStatus.label}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Business */}
                        {settings?.business_name && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Business</Label>
                                <p className="text-sm font-medium mt-0.5">{settings.business_name}</p>
                                {settings.business_city && (
                                    <p className="text-xs text-muted-foreground">
                                        {settings.business_city}, {settings.business_country_code}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Created */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Created</Label>
                            <p className="text-sm mt-0.5">
                                {settings?.created_time ? new Date(settings.created_time).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Spending & Budget */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            Spending & Budget
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Currency */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Currency</Label>
                            <p className="text-sm font-medium mt-0.5">{settings?.currency || 'USD'}</p>
                        </div>

                        {/* Amount Spent */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Total Amount Spent</Label>
                            <p className="text-lg font-bold mt-0.5 text-teal-600">
                                {settings?.amount_spent_formatted || '$0.00'}
                            </p>
                        </div>

                        {/* Spend Cap */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Account Spend Cap</Label>
                            {isEditing ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        value={editSpendCap ?? ''}
                                        onChange={(e) => setEditSpendCap(e.target.value ? parseFloat(e.target.value) : null)}
                                        placeholder="No limit"
                                        className="h-9"
                                    />
                                </div>
                            ) : (
                                <p className="text-sm font-medium mt-0.5">
                                    {settings?.spend_cap_formatted || 'No limit'}
                                </p>
                            )}
                        </div>

                        {/* Balance */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Current Balance</Label>
                            <p className="text-sm font-medium mt-0.5">{settings?.balance_formatted || '$0.00'}</p>
                        </div>

                        {/* Min Daily Budget */}
                        <div>
                            <Label className="text-xs text-muted-foreground">Minimum Daily Budget</Label>
                            <p className="text-sm font-medium mt-0.5">
                                ${settings?.min_daily_budget ? (settings.min_daily_budget / 100).toFixed(2) : '1.00'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Timezone & Region */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-500" />
                            Timezone & Region
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs text-muted-foreground">Timezone</Label>
                            <p className="text-sm font-medium mt-0.5">{settings?.timezone_name || 'N/A'}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Timezone ID</Label>
                            <p className="text-sm font-mono mt-0.5">{settings?.timezone_id || 'N/A'}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Team Access */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            Team Access ({team.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {team.length > 0 ? (
                            <div className="space-y-2">
                                {team.slice(0, 5).map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <div>
                                            <p className="text-sm font-medium">{member.name}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{member.role?.toLowerCase()}</p>
                                        </div>
                                    </div>
                                ))}
                                {team.length > 5 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        +{team.length - 5} more members
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No team members found</p>
                        )}
                    </CardContent>
                </Card>

                {/* Notification Rules - Enhanced UI */}
                <Card className="lg:col-span-2 border-amber-200/50 dark:border-amber-900/30">
                    <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                    <Bell className="w-3.5 h-3.5" />
                                </div>
                                <span>Notification Rules</span>
                                <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                    {notifications.length}
                                </span>
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30">
                                <Zap className="w-3 h-3" />
                                Manage Rules
                            </Button>
                        </div>
                        <CardDescription className="text-xs mt-1.5">
                            Automation rules configured for real-time alerts on campaign performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {notifications.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {notifications.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer group",
                                            rule.status === 'ENABLED'
                                                ? 'border-green-200 bg-green-50/50 hover:border-green-300 dark:border-green-800/50 dark:bg-green-950/20'
                                                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/20'
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                rule.status === 'ENABLED'
                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                            )}>
                                                <Bell className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                                    {rule.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full",
                                                        rule.status === 'ENABLED'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    )}>
                                                        <span className={cn(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            rule.status === 'ENABLED' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
                                                        )} />
                                                        {rule.status === 'ENABLED' ? 'Active' : 'Paused'}
                                                    </span>
                                                    {rule.execution_spec?.execution_type && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            • {rule.execution_spec.execution_type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-6 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                                    <Bell className="w-7 h-7 text-amber-500" />
                                </div>
                                <p className="text-sm font-medium text-foreground">No notification rules configured</p>
                                <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
                                    Create automation rules with NOTIFICATION action type to receive alerts when campaigns hit specific thresholds
                                </p>
                                <Button variant="outline" size="sm" className="mt-4 gap-1.5 border-amber-300 hover:bg-amber-50 text-amber-700 dark:border-amber-700 dark:hover:bg-amber-950/30 dark:text-amber-400">
                                    <Zap className="w-3.5 h-3.5" />
                                    Create Your First Rule
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pixels */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Code className="w-4 h-4 text-cyan-500" />
                            Pixels ({pixels.length})
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Tracking pixels assigned to this account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {pixels.length > 0 ? (
                            <div className="space-y-2">
                                {pixels.map((pixel) => (
                                    <div key={pixel.id} className="flex items-center justify-between p-3 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                pixel.last_fired_time ? 'bg-green-500' : 'bg-slate-400'
                                            )} />
                                            <div>
                                                <p className="text-sm font-medium">{pixel.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{pixel.id}</p>
                                            </div>
                                        </div>
                                        {pixel.last_fired_time && (
                                            <span className="text-xs text-muted-foreground">
                                                Last fired: {new Date(pixel.last_fired_time).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Code className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">No pixels configured</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Activities */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="w-4 h-4 text-orange-500" />
                            Recent Activity ({activities.length})
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Recent changes to this account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activities.length > 0 ? (
                            <div className="space-y-2">
                                {activities.slice(0, 5).map((activity, i) => (
                                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {activity.translated_event_type || activity.event_type}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {activity.actor_name} • {activity.date_time_in_timezone || new Date(activity.event_time * 1000).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">No recent activity</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
