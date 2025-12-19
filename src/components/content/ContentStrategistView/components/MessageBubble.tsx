import React from 'react';
import { Loader2, FileText } from 'lucide-react';
import Image from 'next/image';
import { Message } from '../types';
import { renderMarkdown } from '../utils/markdown';
import { ParametersPreview } from './ParametersPreview';
import logoImage from '../../../../../logo.png';

interface MessageBubbleProps {
    msg: Message;
    isLoading: boolean;
    onConfirmGeneration: () => void;
    onCreatePost: (postData: any) => void;
    onSuggestionClick?: (suggestion: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
    msg,
    isLoading,
    onConfirmGeneration,
    onCreatePost,
    onSuggestionClick
}) => {
    const isUser = msg.role === 'user';
    const isModel = msg.role === 'model';
    const isSystem = msg.role === 'system';

    // Show parameters confirmation UI (from model message, not system)
    if (isModel && msg.parameters) {
        return (
            <ParametersPreview
                parameters={msg.parameters}
                isLoading={isLoading}
                onConfirm={onConfirmGeneration}
            />
        );
    }

    // Post preview removed - posts are now auto-created
    // If postData exists, it means post was already created, just show success message

    return (
        <div className="flex items-start gap-3 py-4 group">
            {isUser && (
                <div className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
                        <Image src={logoImage} alt="User" width={28} height={28} className="object-cover" />
                    </div>
                </div>
            )}
            <div className="flex-1 space-y-2 overflow-hidden min-w-0">
                {/* User Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((file, idx) => (
                            <div key={idx} className="relative group">
                                {file.type === 'image' ? (
                                    <img src={file.url} alt={file.name} className="max-w-xs rounded-lg border border-border shadow-sm" />
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">{file.name}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* AI-Generated Image */}
                {msg.generatedImage && (
                    <div className="my-3">
                        <div className="relative group max-w-lg">
                            <img
                                src={msg.generatedImage}
                                alt="AI Generated"
                                className="w-full rounded-xl border border-border shadow-lg"
                            />
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                                AI Generated
                            </div>
                        </div>
                    </div>
                )}

                {/* AI-Generated Video */}
                {msg.generatedVideo && (
                    <div className="my-3">
                        <div className="relative group max-w-lg">
                            <video
                                src={msg.generatedVideo}
                                controls
                                className="w-full rounded-xl border border-border shadow-lg"
                                playsInline
                            >
                                Your browser does not support the video tag.
                            </video>
                            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded-lg backdrop-blur-sm">
                                AI Generated Video
                            </div>
                        </div>
                    </div>
                )}

                {/* Media Generation Loading State */}
                {msg.isGeneratingMedia && (
                    <div className="my-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            <div>
                                <p className="text-sm font-medium text-emerald-900">Generating media...</p>
                                <p className="text-xs text-emerald-700">This may take a few moments</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message Content - Only show if not already handled by special UI */}
                {msg.content && !msg.postData && !msg.parameters && (
                    <div className={`text-[15px] leading-[1.65] text-foreground font-normal ${isModel ? 'font-manrope' : ''}`}>
                        {isModel ? (
                            renderMarkdown(msg.content)
                        ) : (
                            <div className="inline-block bg-muted dark:bg-muted rounded-2xl px-4 py-2.5">
                                <p className="whitespace-pre-wrap font-normal">{msg.content}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                            {msg.suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSuggestionClick?.(suggestion)}
                                    className="px-3 py-1.5 text-sm bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-full text-primary transition-colors cursor-pointer"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';
