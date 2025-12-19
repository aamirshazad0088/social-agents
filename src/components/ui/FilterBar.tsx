'use client'

import React, { useState, useEffect } from 'react';
import { PostStatus, Platform } from '@/types';
import { PLATFORMS, STATUS_CONFIG } from '@/constants';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface FilterBarProps {
    onSearchChange: (value: string) => void;
    onStatusChange: (value: PostStatus | 'all') => void;
    onPlatformChange: (value: Platform | 'all') => void;
    showStatusFilter?: boolean;
    excludeStatuses?: PostStatus[];
}

const FilterBar: React.FC<FilterBarProps> = ({ onSearchChange, onStatusChange, onPlatformChange, showStatusFilter = true, excludeStatuses = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    // Trigger search only when debounced value changes
    useEffect(() => {
        onSearchChange(debouncedSearch);
    }, [debouncedSearch, onSearchChange]);

    return (
        <div className="bg-card p-4 rounded-lg flex flex-col md:flex-row items-center gap-4 border border-border shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 transition-colors" />
                <input
                    type="text"
                    placeholder="Search by topic..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground p-2.5 pl-10 transition-all duration-200"
                />
            </div>
            <div className="flex w-full md:w-auto gap-3">
                {showStatusFilter && (
                    <select
                        onChange={(e) => onStatusChange(e.target.value as PostStatus | 'all')}
                        className="w-full bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground p-2.5 capitalize transition-all duration-200 hover:shadow-md"
                    >
                        <option value="all">All Statuses</option>
                        {Object.entries(STATUS_CONFIG)
                            .filter(([status]) => !excludeStatuses.includes(status as PostStatus))
                            .map(([status, { label }]) => (
                            <option key={status} value={status}>{label}</option>
                        ))}
                    </select>
                )}
                <select
                    onChange={(e) => onPlatformChange(e.target.value as Platform | 'all')}
                    className="w-full bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-ring focus:border-ring text-foreground p-2.5 transition-all duration-200 hover:shadow-md"
                >
                    <option value="all">All Platforms</option>
                    {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        </div>
    );
};

// OPTIMIZATION: Memoize FilterBar to prevent unnecessary re-renders
export default React.memo(FilterBar);
