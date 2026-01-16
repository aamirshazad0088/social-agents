/**
 * ToolCallBox - Enhanced collapsible tool call visualization
 * Reference: https://github.com/langchain-ai/deep-agents-ui
 */
'use client';

import React, { useState, useMemo } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Wrench,
    Check,
    Loader2,
    AlertCircle,
    Clock,
    Copy,
    Database,
    Code,
    Search,
    FileText,
    Globe,
    Image as ImageIcon,
    Terminal
} from 'lucide-react';
import { ToolCall } from '../types';

interface ToolCallBoxProps {
    toolCall: ToolCall;
    isExpanded?: boolean;
}

// Tool icon mapping
const TOOL_ICONS: Record<string, React.ElementType> = {
    'database': Database,
    'query': Database,
    'sql': Database,
    'code': Code,
    'execute': Terminal,
    'run': Terminal,
    'search': Search,
    'find': Search,
    'file': FileText,
    'read': FileText,
    'write': FileText,
    'web': Globe,
    'fetch': Globe,
    'http': Globe,
    'image': ImageIcon,
    'generate': Wrench,
    'default': Wrench,
};

function getToolIcon(name: string): React.ElementType {
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(TOOL_ICONS)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    return TOOL_ICONS.default;
}

export function ToolCallBox({ toolCall, isExpanded: initialExpanded = false }: ToolCallBoxProps) {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [copiedArgs, setCopiedArgs] = useState(false);
    const [copiedResult, setCopiedResult] = useState(false);

    const ToolIcon = useMemo(() => getToolIcon(toolCall.name), [toolCall.name]);

    const getStatusConfig = () => {
        switch (toolCall.status) {
            case 'completed':
                return {
                    icon: <Check className="w-4 h-4" />,
                    bgColor: 'bg-green-100 dark:bg-green-900/30',
                    textColor: 'text-green-600 dark:text-green-400',
                    borderColor: 'border-green-200 dark:border-green-800',
                    label: 'Completed'
                };
            case 'pending':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                    textColor: 'text-blue-600 dark:text-blue-400',
                    borderColor: 'border-blue-200 dark:border-blue-800',
                    label: 'Running'
                };
            case 'error':
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    bgColor: 'bg-red-100 dark:bg-red-900/30',
                    textColor: 'text-red-600 dark:text-red-400',
                    borderColor: 'border-red-200 dark:border-red-800',
                    label: 'Error'
                };
            case 'interrupted':
                return {
                    icon: <AlertCircle className="w-4 h-4" />,
                    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
                    textColor: 'text-yellow-600 dark:text-yellow-400',
                    borderColor: 'border-yellow-200 dark:border-yellow-800',
                    label: 'Interrupted'
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4" />,
                    bgColor: 'bg-gray-100 dark:bg-gray-800',
                    textColor: 'text-gray-600 dark:text-gray-400',
                    borderColor: 'border-gray-200 dark:border-gray-700',
                    label: 'Pending'
                };
        }
    };

    const status = getStatusConfig();

    const formatToolName = (name: string) => {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatValue = (value: unknown): string => {
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    };

    const handleCopy = async (text: string, type: 'args' | 'result') => {
        await navigator.clipboard.writeText(text);
        if (type === 'args') {
            setCopiedArgs(true);
            setTimeout(() => setCopiedArgs(false), 2000);
        } else {
            setCopiedResult(true);
            setTimeout(() => setCopiedResult(false), 2000);
        }
    };

    const argsString = useMemo(() => {
        if (!toolCall.args || Object.keys(toolCall.args).length === 0) return null;
        return formatValue(toolCall.args);
    }, [toolCall.args]);

    const resultString = useMemo(() => {
        if (!toolCall.result) return null;
        // Truncate long results
        const formatted = formatValue(toolCall.result);
        if (formatted.length > 2000) {
            return formatted.substring(0, 2000) + '\n... (truncated)';
        }
        return formatted;
    }, [toolCall.result]);

    return (
        <div className={`border ${status.borderColor} rounded-lg overflow-hidden my-2 ${status.bgColor}`}>
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-3 p-3 text-left hover:opacity-80 transition-opacity"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                )}

                <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/50">
                    <ToolIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>

                <span className="font-medium text-sm flex-1 text-gray-900 dark:text-white">
                    {formatToolName(toolCall.name)}
                </span>

                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.textColor}`}>
                    {status.icon}
                    <span className="hidden sm:inline">{status.label}</span>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Arguments */}
                    {argsString && (
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Arguments
                                </h4>
                                <button
                                    onClick={() => handleCopy(argsString, 'args')}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    {copiedArgs ? (
                                        <>
                                            <Check size={12} />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto font-mono">
                                <code>{argsString}</code>
                            </pre>
                        </div>
                    )}

                    {/* Result */}
                    {resultString && (
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Result
                                </h4>
                                <button
                                    onClick={() => handleCopy(resultString, 'result')}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    {copiedResult ? (
                                        <>
                                            <Check size={12} />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={12} />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-60 overflow-y-auto font-mono">
                                <code>{resultString}</code>
                            </pre>
                        </div>
                    )}

                    {/* Empty state */}
                    {!argsString && !resultString && (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No details available
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ToolCallBox;
