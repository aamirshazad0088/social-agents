import { useState, useEffect, useRef, useCallback } from 'react';
import { ThreadService, ContentThread } from '@/services/database/threadService.client';

export const useChatHistory = (isHistoryVisible: boolean, workspaceId: string | null) => {
    const [chatHistory, setChatHistory] = useState<ContentThread[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const hasLoadedHistory = useRef(false);

    // Load chat history lazily when history panel is opened
    useEffect(() => {
        if (!isHistoryVisible || hasLoadedHistory.current || !workspaceId) return;
        
        const loadChatHistory = async () => {
            hasLoadedHistory.current = true;
            setIsLoadingHistory(true);
            try {
                const result = await ThreadService.getAllThreads(workspaceId, 50, 0);
                setChatHistory(result.items);
            } catch (e) {
            } finally {
                setIsLoadingHistory(false);
            }
        };
        
        loadChatHistory();
    }, [isHistoryVisible, workspaceId]);

    const deleteThread = useCallback(async (threadId: string, workspaceId: string) => {
        await ThreadService.deleteThread(threadId, workspaceId);
        setChatHistory(prevHistory => prevHistory.filter(t => t.id !== threadId));
    }, []);

    const addThread = useCallback((thread: ContentThread) => {
        setChatHistory(prev => [thread, ...prev]);
    }, []);

    return {
        chatHistory,
        isLoadingHistory,
        deleteThread,
        addThread,
        setChatHistory
    };
};
