import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioWaveformProps {
    isPlaying?: boolean;
    className?: string;
    barCount?: number;
    color?: string; // Optional color class override
    height?: string; // Optional height override
}

export function AudioWaveform({
    isPlaying = false,
    className,
    barCount = 40,
    color = "from-teal-500 to-purple-500",
    height
}: AudioWaveformProps) {
    // Generate random heights once on mount so they don't jitter unless playing
    const [barHeights, setBarHeights] = useState<number[]>([]);

    useEffect(() => {
        setBarHeights(Array.from({ length: barCount }).map(() => Math.random() * 60 + 20));
    }, [barCount]);

    return (
        <div className={cn("flex items-center justify-center gap-0.5 h-full w-full overflow-hidden", className)}>
            {barHeights.map((h, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-1 rounded-full transition-all duration-150 bg-gradient-to-t",
                        color,
                        isPlaying && "animate-pulse"
                    )}
                    style={{
                        height: isPlaying ? `${Math.random() * 60 + 20}%` : `${h}%`,
                        animationDelay: `${i * 50}ms`,
                    }}
                />
            ))}
        </div>
    );
}
