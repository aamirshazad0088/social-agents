'use client';

/**
 * ConfigDialog Component
 * 
 * Settings dialog for agent configuration and debug options.
 * Reference: https://github.com/langchain-ai/deep-agents-ui
 */

import React, { useState } from 'react';
import { Settings, X, Copy, Check, Info, RefreshCw } from 'lucide-react';

interface ConfigDialogProps {
    isOpen: boolean;
    onClose: () => void;
    threadId?: string | null;
    apiEndpoint?: string;
    workspaceId?: string | null;
    onReset?: () => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
    isOpen,
    onClose,
    threadId,
    apiEndpoint = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000',
    workspaceId,
    onReset,
}) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = async (value: string, field: string) => {
        await navigator.clipboard.writeText(value);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Configuration
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Thread ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Thread ID
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
                                {threadId || 'No active thread'}
                            </div>
                            {threadId && (
                                <button
                                    onClick={() => handleCopy(threadId, 'threadId')}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    {copiedField === 'threadId' ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* API Endpoint */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            API Endpoint
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
                                {apiEndpoint}
                            </div>
                            <button
                                onClick={() => handleCopy(apiEndpoint, 'apiEndpoint')}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                {copiedField === 'apiEndpoint' ? (
                                    <Check size={16} className="text-green-500" />
                                ) : (
                                    <Copy size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Workspace ID */}
                    {workspaceId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Workspace ID
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
                                    {workspaceId}
                                </div>
                                <button
                                    onClick={() => handleCopy(workspaceId, 'workspaceId')}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    {copiedField === 'workspaceId' ? (
                                        <Check size={16} className="text-green-500" />
                                    ) : (
                                        <Copy size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Info box */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            The agent uses LangGraph for conversation memory. Each thread maintains its own context and history.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Deep Agents v1.0
                    </div>
                    <div className="flex items-center gap-2">
                        {onReset && (
                            <button
                                onClick={onReset}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <RefreshCw size={16} />
                                Reset Chat
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

ConfigDialog.displayName = 'ConfigDialog';

export default ConfigDialog;
