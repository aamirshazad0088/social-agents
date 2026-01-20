/**
 * useStreamPersistence Hook
 * 
 * Handles session persistence for stream resumption after page refresh.
 * Based on LangGraph SDK reconnectOnMount pattern.
 * 
 * Reference: https://github.com/langchain-ai/deep-agents-ui
 */

import { useCallback } from 'react';

// Session storage key prefix
const STORAGE_PREFIX = 'langgraph-run:';

export interface StreamPersistenceReturn {
    /** Save run ID to session storage for later resumption */
    saveRunId: (runId: string) => void;
    /** Clear stored run ID (call on completion/error) */
    clearRunId: () => void;
    /** Get stored run ID if exists */
    getStoredRunId: () => string | null;
    /** Check if there's a stored run to resume */
    hasStoredRun: () => boolean;
}

/**
 * Handle stream resumption after page refresh
 * Based on LangGraph SDK reconnectOnMount pattern
 */
export function useStreamPersistence(threadId: string | null): StreamPersistenceReturn {
    /**
     * Save run ID to session storage
     */
    const saveRunId = useCallback((runId: string) => {
        if (!threadId) return;

        try {
            sessionStorage.setItem(`${STORAGE_PREFIX}${threadId}`, runId);
        } catch (e) {
            // Session storage might be full or unavailable
            console.warn('[useStreamPersistence] Failed to save run ID:', e);
        }
    }, [threadId]);

    /**
     * Clear stored run ID (call on stream completion or error)
     */
    const clearRunId = useCallback(() => {
        if (!threadId) return;

        try {
            sessionStorage.removeItem(`${STORAGE_PREFIX}${threadId}`);
        } catch (e) {
            console.warn('[useStreamPersistence] Failed to clear run ID:', e);
        }
    }, [threadId]);

    /**
     * Get stored run ID if it exists
     */
    const getStoredRunId = useCallback((): string | null => {
        if (!threadId) return null;

        try {
            return sessionStorage.getItem(`${STORAGE_PREFIX}${threadId}`);
        } catch {
            return null;
        }
    }, [threadId]);

    /**
     * Check if there's a stored run to resume
     */
    const hasStoredRun = useCallback((): boolean => {
        return getStoredRunId() !== null;
    }, [getStoredRunId]);

    return {
        saveRunId,
        clearRunId,
        getStoredRunId,
        hasStoredRun,
    };
}
