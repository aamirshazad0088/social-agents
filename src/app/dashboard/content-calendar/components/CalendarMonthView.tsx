'use client';

import React from 'react';
import type { CalendarEntry } from '../types';

interface CalendarMonthViewProps {
    entries: CalendarEntry[];
    currentDate: Date;
    onEntryClick: (entry: CalendarEntry) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarMonthView({ entries, currentDate, onEntryClick }: CalendarMonthViewProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay();

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Calculate total cells needed (might need 5 or 6 rows)
    const totalCells = Math.ceil((startingDay + totalDays) / 7) * 7;

    // Group entries by date
    const entriesByDate = entries.reduce((acc, entry) => {
        const dateKey = entry.scheduled_date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
    }, {} as Record<string, CalendarEntry[]>);

    const today = new Date().toISOString().split('T')[0];

    // Generate calendar cells
    const cells = Array.from({ length: totalCells }, (_, index) => {
        const dayNumber = index - startingDay + 1;
        const isCurrentMonth = dayNumber > 0 && dayNumber <= totalDays;

        if (!isCurrentMonth) return null;

        const date = new Date(year, month, dayNumber);
        const dateKey = date.toISOString().split('T')[0];
        const dayEntries = entriesByDate[dateKey] || [];
        const isToday = dateKey === today;

        return {
            dayNumber,
            date,
            dateKey,
            dayEntries,
            isToday,
        };
    });

    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-muted/50 border-b">
                {DAYS.map((day) => (
                    <div key={day} className="px-2 py-2 text-center text-xs font-medium uppercase text-muted-foreground">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {cells.map((cell, index) => {
                    if (!cell) {
                        return (
                            <div key={index} className="min-h-[100px] border-b border-r bg-muted/20" />
                        );
                    }

                    const { dayNumber, dayEntries, isToday } = cell;

                    return (
                        <div
                            key={index}
                            className={`min-h-[100px] border-b border-r p-1 ${isToday ? 'bg-primary/5' : ''
                                }`}
                        >
                            {/* Day Number */}
                            <div className={`text-sm font-medium mb-1 ${isToday
                                    ? 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                                    : 'text-muted-foreground'
                                }`}>
                                {dayNumber}
                            </div>

                            {/* Entries (show max 3) */}
                            <div className="space-y-1">
                                {dayEntries.slice(0, 3).map((entry) => (
                                    <div
                                        key={entry.id}
                                        onClick={() => onEntryClick(entry)}
                                        className="px-1 py-0.5 rounded text-[10px] text-white truncate cursor-pointer hover:opacity-90"
                                        style={{ backgroundColor: entry.color }}
                                    >
                                        {entry.title}
                                    </div>
                                ))}
                                {dayEntries.length > 3 && (
                                    <div className="text-[10px] text-muted-foreground px-1">
                                        +{dayEntries.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CalendarMonthView;
