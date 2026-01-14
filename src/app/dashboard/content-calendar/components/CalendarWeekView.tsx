'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { CalendarEntry, CONTENT_TYPE_LABELS, PLATFORM_LABELS } from '../types';

interface CalendarWeekViewProps {
    entries: CalendarEntry[];
    currentDate: Date;
    onEntryClick: (entry: CalendarEntry) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarWeekView({ entries, currentDate, onEntryClick }: CalendarWeekViewProps) {
    // Calculate week start (Sunday)
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // Generate week days
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        return day;
    });

    // Group entries by date
    const entriesByDate = entries.reduce((acc, entry) => {
        const dateKey = entry.scheduled_date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, CalendarEntry[]>);

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
            {weekDays.map((day, index) => {
                const dateKey = day.toISOString().split('T')[0];
                const dayEntries = entriesByDate[dateKey] || [];
                const isToday = dateKey === today;

                return (
                    <div
                        key={index}
                        className={`flex flex-col border rounded-lg overflow-hidden ${isToday ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                    >
                        {/* Day Header */}
                        <div className={`px-2 py-2 text-center border-b ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                            }`}>
                            <div className="text-xs font-medium uppercase">{SHORT_DAYS[index]}</div>
                            <div className={`text-lg font-bold ${isToday ? '' : 'text-muted-foreground'}`}>
                                {day.getDate()}
                            </div>
                        </div>

                        {/* Entries */}
                        <div className="flex-1 p-1 space-y-1 overflow-y-auto max-h-[300px]">
                            {dayEntries.length === 0 ? (
                                <div className="text-xs text-center text-muted-foreground py-4">
                                    No content
                                </div>
                            ) : (
                                dayEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        onClick={() => onEntryClick(entry)}
                                        className="p-2 rounded cursor-pointer text-white text-xs hover:opacity-90 transition-opacity"
                                        style={{ backgroundColor: entry.color }}
                                    >
                                        <div className="font-medium truncate">{entry.title}</div>
                                        <div className="flex items-center gap-1 mt-1 opacity-90">
                                            <span className="capitalize">{entry.platform}</span>
                                            {entry.scheduled_time && (
                                                <span>• {entry.scheduled_time.slice(0, 5)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default CalendarWeekView;
