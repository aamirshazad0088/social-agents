'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Save, Image, Video, Hash, FileText, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { CalendarEntry, Platform, ContentType, PostType, EntryStatus } from '../types';
import { POST_TYPES_BY_PLATFORM, POST_TYPE_LABELS } from '../types';

interface EntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: CalendarEntry | null;
    onSave: () => void;
}

const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'twitter', 'tiktok', 'youtube', 'facebook'];
const CONTENT_TYPES: ContentType[] = [
    'educational', 'fun', 'inspirational', 'promotional',
    'interactive', 'brand_related', 'evergreen', 'holiday_themed'
];
const STATUSES: EntryStatus[] = ['draft', 'scheduled', 'published', 'archived'];

const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
    educational: '#6366F1',    // Indigo
    fun: '#10B981',            // Emerald
    inspirational: '#F59E0B',  // Amber
    promotional: '#F97316',    // Orange
    interactive: '#8B5CF6',    // Violet
    brand_related: '#06B6D4',  // Cyan
    evergreen: '#22C55E',      // Green
    holiday_themed: '#EC4899', // Pink
};

// Platform icons for display - using react-icons brand icons
import { FaInstagram, FaFacebookF, FaLinkedinIn, FaTiktok, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
    instagram: <FaInstagram className="w-4 h-4" />,
    facebook: <FaFacebookF className="w-4 h-4" />,
    twitter: <FaXTwitter className="w-4 h-4" />,
    linkedin: <FaLinkedinIn className="w-4 h-4" />,
    tiktok: <FaTiktok className="w-4 h-4" />,
    youtube: <FaYoutube className="w-4 h-4" />,
};

// Platform gradient colors
const PLATFORM_GRADIENTS: Record<Platform, string> = {
    instagram: 'from-pink-500 to-purple-500',
    facebook: 'from-blue-600 to-blue-400',
    twitter: 'from-gray-800 to-gray-600',
    linkedin: 'from-blue-700 to-blue-500',
    tiktok: 'from-cyan-400 to-pink-500',
    youtube: 'from-red-600 to-red-400',
};

export function EntryModal({ isOpen, onClose, entry, onSave }: EntryModalProps) {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('content');

    const [formData, setFormData] = useState({
        scheduled_date: '',
        scheduled_time: '',
        platform: 'instagram' as Platform,
        content_type: 'educational' as ContentType,
        post_type: 'post' as PostType,
        title: '',
        content: '',
        hashtags: '',
        image_prompt: '',
        video_script: '',
        notes: '',
        status: 'scheduled' as EntryStatus,
    });

    useEffect(() => {
        if (entry) {
            setFormData({
                scheduled_date: entry.scheduled_date,
                scheduled_time: entry.scheduled_time || '',
                platform: entry.platform,
                content_type: entry.content_type,
                post_type: entry.post_type || 'post',
                title: entry.title,
                content: entry.content || '',
                hashtags: entry.hashtags?.join(', ') || '',
                image_prompt: entry.image_prompt || '',
                video_script: entry.video_script || '',
                notes: entry.notes || '',
                status: entry.status,
            });
        } else {
            // New entry - default to today
            const today = new Date().toISOString().split('T')[0];
            setFormData({
                scheduled_date: today,
                scheduled_time: '09:00',
                platform: 'instagram',
                content_type: 'educational',
                post_type: 'post',
                title: '',
                content: '',
                hashtags: '',
                image_prompt: '',
                video_script: '',
                notes: '',
                status: 'scheduled',
            });
        }
    }, [entry, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.access_token) return;

        setLoading(true);
        try {
            const payload = {
                ...formData,
                hashtags: formData.hashtags ? formData.hashtags.split(',').map(h => h.trim()) : null,
                scheduled_time: formData.scheduled_time || null,
            };

            const url = entry
                ? `/api/calendar/${entry.id}`
                : `/api/calendar`;

            const response = await fetch(url, {
                method: entry ? 'PUT' : 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                onSave();
            }
        } catch (error) {
            console.error('Error saving entry:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!entry || !session?.access_token) return;

        if (!confirm('Are you sure you want to delete this entry?')) return;

        setDeleting(true);
        try {
            const response = await fetch(
                `/api/calendar/${entry.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                }
            );

            if (response.ok) {
                onSave();
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-start gap-4">
                        {/* Platform Icon */}
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${PLATFORM_GRADIENTS[formData.platform]} shadow-lg`}>
                            <span className="text-2xl">{PLATFORM_ICONS[formData.platform]}</span>
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold">
                                {entry ? 'Edit Calendar Entry' : 'New Calendar Entry'}
                            </DialogTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">
                                    {formData.platform}
                                </Badge>
                                {formData.post_type && (
                                    <Badge variant="secondary">
                                        {POST_TYPE_LABELS[formData.post_type as PostType] || formData.post_type}
                                    </Badge>
                                )}
                                {formData.content_type && (
                                    <Badge
                                        style={{ backgroundColor: CONTENT_TYPE_COLORS[formData.content_type] }}
                                        className="text-white"
                                    >
                                        {formData.content_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    {/* Schedule Section */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Schedule
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Date *</Label>
                                <Input
                                    type="date"
                                    value={formData.scheduled_date}
                                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                    required
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Time</Label>
                                <Input
                                    type="time"
                                    value={formData.scheduled_time}
                                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                    className="h-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Platform & Type Section */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-muted/50 to-transparent border">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Content Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Platform *</Label>
                                <Select
                                    value={formData.platform}
                                    onValueChange={(v) => {
                                        const newPlatform = v as Platform;
                                        const availableTypes = POST_TYPES_BY_PLATFORM[newPlatform] || ['post'];
                                        const newPostType = availableTypes.includes(formData.post_type as PostType)
                                            ? formData.post_type
                                            : availableTypes[0] as PostType;
                                        setFormData({ ...formData, platform: newPlatform, post_type: newPostType });
                                    }}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PLATFORMS.map((p) => (
                                            <SelectItem key={p} value={p}>
                                                <div className="flex items-center gap-2">
                                                    <span>{PLATFORM_ICONS[p]}</span>
                                                    <span className="capitalize">{p}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Post Type *</Label>
                                <Select
                                    value={formData.post_type}
                                    onValueChange={(v) => setFormData({ ...formData, post_type: v as PostType })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(POST_TYPES_BY_PLATFORM[formData.platform] || ['post']).map((pt) => (
                                            <SelectItem key={pt} value={pt}>
                                                {POST_TYPE_LABELS[pt as PostType] || pt.charAt(0).toUpperCase() + pt.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Content Type *</Label>
                                <Select
                                    value={formData.content_type}
                                    onValueChange={(v) => setFormData({ ...formData, content_type: v as ContentType })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONTENT_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: CONTENT_TYPE_COLORS[t] }}
                                                    />
                                                    {t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) => setFormData({ ...formData, status: v as EntryStatus })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${s === 'draft' ? 'bg-yellow-400' :
                                                        s === 'scheduled' ? 'bg-blue-400' :
                                                            s === 'published' ? 'bg-green-400' : 'bg-gray-400'
                                                        }`} />
                                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Title Section */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Title *</Label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Brief title for the content"
                            required
                            maxLength={200}
                            className="h-11 text-base font-medium"
                        />
                    </div>

                    {/* Tabbed Content */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                        <TabsList className="w-full">
                            <TabsTrigger value="content" className="flex-1">
                                <FileText className="w-4 h-4 mr-1" />
                                Content
                            </TabsTrigger>
                            <TabsTrigger value="media" className="flex-1">
                                <Image className="w-4 h-4 mr-1" />
                                Media
                            </TabsTrigger>
                            <TabsTrigger value="video" className="flex-1">
                                <Video className="w-4 h-4 mr-1" />
                                Video
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="content" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Post Content</Label>
                                <Textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Full post caption/content..."
                                    rows={14}
                                    className="min-h-[280px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1">
                                    <Hash className="w-4 h-4" />
                                    Hashtags
                                </Label>
                                <Input
                                    value={formData.hashtags}
                                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                                    placeholder="fitness, health, workout (comma separated)"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Notes (Internal)</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Internal notes for team..."
                                    rows={2}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="media" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Image Generation Prompt</Label>
                                <Textarea
                                    value={formData.image_prompt}
                                    onChange={(e) => setFormData({ ...formData, image_prompt: e.target.value })}
                                    placeholder="Describe the image you want to generate..."
                                    rows={14}
                                    className="min-h-[280px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use the Content Strategist AI to generate images based on this prompt.
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="video" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Video Script</Label>
                                <Textarea
                                    value={formData.video_script}
                                    onChange={(e) => setFormData({ ...formData, video_script: e.target.value })}
                                    placeholder="Write your video script here..."
                                    rows={14}
                                    className="min-h-[280px]"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="gap-2 pt-4 border-t mt-6">
                        {entry && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="gap-2"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete
                            </Button>
                        )}
                        <div className="flex-1" />
                        <Button type="button" variant="outline" onClick={onClose} className="px-6">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="gap-2 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {entry ? 'Update Entry' : 'Create Entry'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default EntryModal;
