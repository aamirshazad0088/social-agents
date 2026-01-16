'use client';

/**
 * ToolApprovalInterrupt Component
 * 
 * UI for human-in-the-loop tool approval when agent needs permission.
 * Reference: https://github.com/langchain-ai/deep-agents-ui
 */

import React, { useState, useCallback } from 'react';
import { AlertTriangle, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export interface ActionRequest {
    id: string;
    name: string;
    description?: string;
    args?: Record<string, unknown>;
}

interface ToolApprovalInterruptProps {
    actionRequest: ActionRequest;
    onApprove: (actionId: string) => Promise<void>;
    onDeny: (actionId: string, reason?: string) => Promise<void>;
    isProcessing?: boolean;
}

export const ToolApprovalInterrupt: React.FC<ToolApprovalInterruptProps> = ({
    actionRequest,
    onApprove,
    onDeny,
    isProcessing = false,
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [showDenyInput, setShowDenyInput] = useState(false);

    const handleApprove = useCallback(async () => {
        await onApprove(actionRequest.id);
    }, [actionRequest.id, onApprove]);

    const handleDeny = useCallback(async () => {
        if (showDenyInput && denyReason.trim()) {
            await onDeny(actionRequest.id, denyReason);
        } else if (!showDenyInput) {
            setShowDenyInput(true);
        } else {
            await onDeny(actionRequest.id);
        }
    }, [actionRequest.id, onDeny, showDenyInput, denyReason]);

    const formatArgs = (args: Record<string, unknown>) => {
        try {
            return JSON.stringify(args, null, 2);
        } catch {
            return String(args);
        }
    };

    return (
        <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 my-4">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-800/50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Action Approval Required
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        The agent wants to execute: <strong>{actionRequest.name}</strong>
                    </p>
                    {actionRequest.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {actionRequest.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Action details expandable */}
            {actionRequest.args && Object.keys(actionRequest.args).length > 0 && (
                <div className="mt-4">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {showDetails ? (
                            <ChevronUp size={16} />
                        ) : (
                            <ChevronDown size={16} />
                        )}
                        {showDetails ? 'Hide' : 'View'} Arguments
                    </button>

                    {showDetails && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-auto max-h-60">
                            <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {formatArgs(actionRequest.args)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Deny reason input */}
            {showDenyInput && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Reason for denial (optional)
                    </label>
                    <textarea
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        placeholder="Provide a reason..."
                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        rows={2}
                    />
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800">
                <button
                    onClick={handleDeny}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <X size={16} />
                    )}
                    {showDenyInput ? 'Confirm Deny' : 'Deny'}
                </button>
                <button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Check size={16} />
                    )}
                    Approve
                </button>
            </div>
        </div>
    );
};

ToolApprovalInterrupt.displayName = 'ToolApprovalInterrupt';

export default ToolApprovalInterrupt;
