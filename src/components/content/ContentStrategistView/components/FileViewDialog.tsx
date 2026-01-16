'use client';

/**
 * FileViewDialog Component
 * 
 * Modal dialog to view and edit generated files with syntax highlighting.
 * Reference: https://github.com/langchain-ai/deep-agents-ui
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FileText, Copy, Download, Edit, Save, X, Loader2, Check } from 'lucide-react';

// Language mapping for syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    md: 'markdown',
    markdown: 'markdown',
};

export interface FileItem {
    path: string;
    content: string;
}

interface FileViewDialogProps {
    file: FileItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSaveFile?: (fileName: string, content: string) => Promise<void>;
    editDisabled?: boolean;
}

export const FileViewDialog: React.FC<FileViewDialogProps> = ({
    file,
    isOpen,
    onClose,
    onSaveFile,
    editDisabled = true,
}) => {
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileContent, setFileContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Reset state when file changes
    useEffect(() => {
        if (file) {
            setFileName(file.path);
            setFileContent(file.content);
            setIsEditingMode(false);
        }
    }, [file]);

    const fileExtension = useMemo(() => {
        return fileName.split('.').pop()?.toLowerCase() || '';
    }, [fileName]);

    const isMarkdown = useMemo(() => {
        return fileExtension === 'md' || fileExtension === 'markdown';
    }, [fileExtension]);

    const language = useMemo(() => {
        return LANGUAGE_MAP[fileExtension] || 'text';
    }, [fileExtension]);

    const handleCopy = useCallback(async () => {
        if (fileContent) {
            await navigator.clipboard.writeText(fileContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [fileContent]);

    const handleDownload = useCallback(() => {
        if (fileContent && fileName) {
            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.split('/').pop() || 'file.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }, [fileContent, fileName]);

    const handleEdit = useCallback(() => {
        setIsEditingMode(true);
    }, []);

    const handleCancel = useCallback(() => {
        if (file) {
            setFileName(file.path);
            setFileContent(file.content);
        }
        setIsEditingMode(false);
    }, [file]);

    const handleSave = useCallback(async () => {
        if (!onSaveFile || !fileName.trim() || !fileContent.trim()) return;

        setIsSaving(true);
        try {
            await onSaveFile(fileName, fileContent);
            setIsEditingMode(false);
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    }, [fileName, fileContent, onSaveFile]);

    if (!isOpen || !file) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative z-10 flex h-[80vh] w-[80vw] max-w-5xl flex-col rounded-xl bg-white dark:bg-gray-900 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        {isEditingMode ? (
                            <input
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="Enter filename..."
                                className="text-base font-medium bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        ) : (
                            <span className="truncate text-base font-medium text-gray-900 dark:text-white">
                                {file.path}
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                            {language}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {!isEditingMode && (
                            <>
                                {!editDisabled && onSaveFile && (
                                    <button
                                        onClick={handleEdit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <Edit size={16} />
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <Download size={16} />
                                    Download
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ml-2"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {isEditingMode ? (
                        <textarea
                            value={fileContent}
                            onChange={(e) => setFileContent(e.target.value)}
                            placeholder="Enter file content..."
                            className="h-full w-full resize-none p-6 font-mono text-sm bg-transparent focus:outline-none"
                        />
                    ) : (
                        <div className="h-full overflow-auto p-6">
                            {fileContent ? (
                                isMarkdown ? (
                                    <div className="prose dark:prose-invert max-w-none">
                                        <pre className="whitespace-pre-wrap">{fileContent}</pre>
                                    </div>
                                ) : (
                                    <pre className="font-mono text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                                        <code className={`language-${language}`}>
                                            {fileContent}
                                        </code>
                                    </pre>
                                )
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        File is empty
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Edit mode footer */}
                {isEditingMode && (
                    <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !fileName.trim() || !fileContent.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Save
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

FileViewDialog.displayName = 'FileViewDialog';

export default FileViewDialog;
