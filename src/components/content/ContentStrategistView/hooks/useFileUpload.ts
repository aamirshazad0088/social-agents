import { useState, useCallback, useRef } from 'react';
import { AttachedFile } from '../types';

export const useFileUpload = () => {
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [showUploadMenu, setShowUploadMenu] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        (Array.from(files) as File[]).forEach((file) => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError(`File ${file.name} is too large. Maximum size is 10MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                const fileType = file.type.startsWith('image/') ? 'image' : 'file';
                
                setAttachedFiles((prev) => [...prev, {
                    type: fileType,
                    name: file.name,
                    url: url,
                    size: file.size
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset inputs and close menu
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
        setShowUploadMenu(false);
    }, []);

    const removeAttachment = useCallback((index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const clearAttachments = useCallback(() => {
        setAttachedFiles([]);
    }, []);

    return {
        attachedFiles,
        showUploadMenu,
        fileInputRef,
        imageInputRef,
        error,
        handleFileUpload,
        removeAttachment,
        clearAttachments,
        setShowUploadMenu,
        setError
    };
};
