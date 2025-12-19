import React from 'react';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { ContentThread } from '@/services/database/threadService.client';

interface SidebarProps {
    chatHistory: ContentThread[];
    activeThreadId: string | 'new';
    isCreatingNewChat: boolean;
    onNewChat: () => void;
    onSelectThread: (thread: ContentThread) => void;
    onDeleteThread: (e: React.MouseEvent, threadId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    chatHistory,
    activeThreadId,
    isCreatingNewChat,
    onNewChat,
    onSelectThread,
    onDeleteThread
}) => {
    return (
        <div className="w-56 bg-card flex flex-col h-full border-r border-border">
            <div className="pt-14 pl-4 pr-2 pb-4 border-b border-border">
                <button
                    onClick={onNewChat}
                    disabled={isCreatingNewChat}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-foreground bg-card hover:bg-muted border border-border shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCreatingNewChat ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <PlusCircle className="w-4 h-4" />
                    )}
                    {isCreatingNewChat ? 'Creating...' : 'New chat'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto pl-8 pr-0.5 py-3 scrollbar-hide">
                <div className="text-xs font-semibold text-muted-foreground pl-2 py-1 uppercase tracking-wider">Recent messages</div>
                <nav className="space-y-1 mt-2 ml-2">
                    {chatHistory.map(thread => (
                        <div
                            key={thread.id}
                            className={`relative flex items-center gap-2 py-3 pl-4 pr-0.5 rounded-lg transition-all group ${
                                activeThreadId === thread.id ? 'bg-muted shadow-sm border border-border' : 'hover:bg-muted/50'
                            }`}
                        >
                            <button
                                onClick={() => onSelectThread(thread)}
                                className="flex-1 text-left overflow-hidden"
                            >
                                <p className="text-sm text-foreground font-semibold line-clamp-2 leading-relaxed">{thread.title}</p>
                            </button>
                            <button
                                onClick={(e) => onDeleteThread(e, thread.id)}
                                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                title="Delete chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </nav>
            </div>
        </div>
    );
};
