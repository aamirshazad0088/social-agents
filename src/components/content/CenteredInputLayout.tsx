import React, { FormEvent, useState, useRef, useEffect } from 'react';
import { Bot, PlusCircle, Mic, MicOff, Send, X, FileText, Paperclip, Sparkles, Lightbulb, BookOpen, ChevronRight, History, PanelLeftClose, Image as ImageIcon, ChevronDown, Check, AlertCircle } from 'lucide-react';
import { AI_MODELS, DEFAULT_AI_MODEL_ID } from '@/constants/aiModels';
import Image from 'next/image';

import logoImage from '../../../logo.png';

// Supported file types
const SUPPORTED_IMAGE_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.ico,.tiff,.heic,.heif';
const SUPPORTED_DOC_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.json';

interface CenteredInputLayoutProps {
    userInput: string;
    setUserInput: (value: string) => void;
    handleSubmit: (e: FormEvent) => void;
    isLoading: boolean;
    isCreatingNewChat: boolean;
    error: string | null;
    attachedFiles: Array<{ type: 'image' | 'file', name: string, url: string, size: number }>;
    removeAttachment: (index: number) => void;
    showUploadMenu: boolean;
    setShowUploadMenu: (value: boolean) => void;
    isRecording: boolean;
    toggleVoiceInput: () => void;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => void;
    isHistoryVisible: boolean;
    setIsHistoryVisible: (value: boolean) => void;
    selectedModelId: string;
    setSelectedModelId: (modelId: string) => void;
}

export const CenteredInputLayout: React.FC<CenteredInputLayoutProps> = ({
    userInput,
    setUserInput,
    handleSubmit,
    isLoading,
    isCreatingNewChat,
    error,
    attachedFiles,
    removeAttachment,
    showUploadMenu,
    setShowUploadMenu,
    isRecording,
    toggleVoiceInput,
    imageInputRef,
    fileInputRef,
    inputRef,
    handleFileUpload,
    isHistoryVisible,
    setIsHistoryVisible,
    selectedModelId,
    setSelectedModelId,
}) => {
    const [localShowMenu, setLocalShowMenu] = useState(false);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const modelMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setLocalShowMenu(false);
            }
            if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
                setShowModelDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 bg-background relative">
            {/* History Toggle Button - Top Left */}
            <div className="absolute top-8 left-6 z-20">
                <button
                    onClick={() => setIsHistoryVisible(!isHistoryVisible)}
                    className="p-2 rounded-lg bg-card hover:bg-card/90 border border-border shadow-sm transition-all"
                    title={isHistoryVisible ? "Hide sidebar" : "Show sidebar"}
                >
                    {isHistoryVisible ? <PanelLeftClose className="w-5 h-5 text-foreground" /> : <History className="w-5 h-5 text-foreground" />}
                </button>
            </div>

            {/* Centered Content */}
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center space-y-8">
                {/* Greeting Message */}
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center mx-auto">
                        <Image src={logoImage} alt="Content OS" width={48} height={48} className="object-cover" />
                    </div>
                    <h1 className="text-3xl font-semibold text-foreground">How can I help you today?</h1>
                </div>

                {/* Centered Input Area */}
                <div className="w-full max-w-2xl">
                    {error && (
                        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-destructive">{error}</p>
                                <p className="text-xs text-muted-foreground mt-1">Try selecting a different model or check your settings.</p>
                            </div>
                        </div>
                    )}
                    {/* Attached Files Preview */}
                    {attachedFiles.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {attachedFiles.map((file: any, idx: number) => (
                                <div key={idx} className="relative group">
                                    {file.type === 'image' ? (
                                        <div className="relative">
                                            <img src={file.url} alt={file.name} className="h-20 w-20 object-cover rounded-lg border border-gray-300" />
                                            <button
                                                onClick={() => removeAttachment(idx)}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-gray-300">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground max-w-[150px] truncate">{file.name}</span>
                                            <button
                                                onClick={() => removeAttachment(idx)}
                                                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                <X className="w-3 h-3 text-muted-foreground" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File Inputs - placed outside form */}
                    <input
                        type="file"
                        multiple
                        accept={SUPPORTED_IMAGE_TYPES}
                        onChange={(e) => { handleFileUpload(e, 'image'); setLocalShowMenu(false); }}
                        id="centered-image-upload-input"
                        style={{ display: 'none' }}
                    />
                    <input
                        type="file"
                        multiple
                        accept={SUPPORTED_DOC_TYPES}
                        onChange={(e) => { handleFileUpload(e, 'file'); setLocalShowMenu(false); }}
                        id="centered-document-upload-input"
                        style={{ display: 'none' }}
                    />

                    <form onSubmit={handleSubmit} className="relative">
                        <div className="flex items-center gap-2 bg-card rounded-[20px] px-3.5 py-2.5 shadow-sm border border-border hover:border-border/80 transition-colors">
                            {/* Plus Button with Dropdown Menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setLocalShowMenu(!localShowMenu)}
                                    disabled={isLoading || isCreatingNewChat}
                                    className="p-1 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                    title="Attach files"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                </button>

                                {/* Upload Menu Dropdown */}
                                {localShowMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[200px] z-50">
                                        <div className="px-3 py-2 border-b border-border">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload Files</p>
                                        </div>

                                        {/* Images Option */}
                                        <label
                                            htmlFor="centered-image-upload-input"
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-foreground block">Images</span>
                                                <span className="text-xs text-muted-foreground">JPG, PNG,</span>
                                            </div>
                                        </label>

                                        {/* Documents Option */}
                                        <label
                                            htmlFor="centered-document-upload-input"
                                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-foreground block">Documents</span>
                                                <span className="text-xs text-muted-foreground">PDF, DOC, PPT, TXT</span>
                                            </div>
                                        </label>

                                        <div className="px-3 py-2 border-t border-border mt-1">
                                            <p className="text-xs text-muted-foreground">Max 10MB per file </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Text Input */}
                            <input
                                ref={inputRef}
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="How can I help you today?"
                                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-foreground font-semibold text-[15px] placeholder:text-muted-foreground disabled:text-muted-foreground"
                                disabled={isLoading || isCreatingNewChat}
                                autoFocus
                            />

                            {/* Voice Input Button - for text transcription */}
                            <button
                                type="button"
                                onClick={toggleVoiceInput}
                                disabled={isLoading || isCreatingNewChat}
                                className="p-1 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                                title={isRecording ? "Stop recording" : "Voice input"}
                            >
                                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={isLoading || isCreatingNewChat}
                                className="p-2 rounded-lg text-white bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-2 flex justify-end">
                        <div className="relative" ref={modelMenuRef}>
                            <button
                                type="button"
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                disabled={isLoading || isCreatingNewChat}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                title="Select AI Model"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="max-w-[140px] truncate">{AI_MODELS.find(m => m.id === selectedModelId)?.name || 'Model'}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showModelDropdown && (
                                <div className="absolute bottom-full right-0 mb-2 bg-card rounded-xl shadow-lg border border-border py-1 min-w-[220px] max-h-64 overflow-y-auto z-50">
                                    <div className="px-3 py-2 border-b border-border">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Model</p>
                                    </div>
                                    {AI_MODELS.map((model) => (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedModelId(model.id);
                                                setShowModelDropdown(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-left ${selectedModelId === model.id ? 'bg-primary/10' : ''}`}
                                        >
                                            <div>
                                                <span className="text-sm font-medium text-foreground block">{model.name}</span>
                                                <span className="text-xs text-muted-foreground">{model.providerLabel}</span>
                                            </div>
                                            {selectedModelId === model.id && (
                                                <Check className="w-4 h-4 text-primary" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
