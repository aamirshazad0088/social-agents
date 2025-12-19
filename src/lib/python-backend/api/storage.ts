/**
 * Storage API
 * 
 * API client for file storage operations including upload, download,
 * signed URL generation, and file management.
 */

import { get, post, del, uploadFile as uploadFormData } from '../client';
import { ENDPOINTS } from '../config';
import type {
    Base64UploadRequest,
    UploadResponse,
    SignedUrlRequest,
    SignedUrlResponse,
    FileListResponse,
} from '../types';

/**
 * Upload a file using FormData
 * 
 * Preferred method for large files. Sends file as multipart/form-data.
 * 
 * @param file - File object to upload
 * @param folder - Optional folder path within storage bucket
 * @returns Promise resolving to upload response with public URL
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = await uploadFile(file, "images");
 * console.log("Uploaded to:", result.url);
 * ```
 */
export async function uploadFile(
    file: File,
    folder: string = 'uploads'
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return uploadFormData<UploadResponse>(
        ENDPOINTS.storage.upload,
        formData
    );
}

/**
 * Upload a file using base64 data
 * 
 * Alternative upload method for smaller files or generated content.
 * 
 * @param base64Data - Base64 encoded file data (with or without data URL prefix)
 * @param fileName - Original file name
 * @param folder - Optional folder path
 * @param type - Optional file type hint
 * @returns Promise resolving to upload response with public URL
 * 
 * @example
 * ```typescript
 * const result = await uploadBase64(
 *   "data:image/png;base64,iVBORw0KGgoAAAANS...",
 *   "generated-image.png",
 *   "generated"
 * );
 * console.log("Uploaded to:", result.url);
 * ```
 */
export async function uploadBase64(
    base64Data: string,
    fileName: string,
    folder: string = 'uploads',
    type: string = 'image'
): Promise<UploadResponse> {
    const request: Base64UploadRequest = {
        base64Data,
        fileName,
        folder,
        type,
    };

    return post<UploadResponse>(
        ENDPOINTS.storage.uploadJson,
        request
    );
}

/**
 * Create a signed upload URL for direct client-to-storage uploads
 * 
 * Bypasses API body size limits by allowing direct uploads to Supabase Storage.
 * Useful for large files (videos, etc.).
 * 
 * @param fileName - Desired file name
 * @param contentType - Optional MIME type
 * @param folder - Optional folder path
 * @returns Promise resolving to signed URL and upload token
 * 
 * @example
 * ```typescript
 * const { signedUrl, publicUrl } = await createSignedUploadUrl(
 *   "large-video.mp4",
 *   "video/mp4"
 * );
 * 
 * // Upload directly to signed URL
 * await fetch(signedUrl, { method: 'PUT', body: videoBlob });
 * console.log("Video available at:", publicUrl);
 * ```
 */
export async function createSignedUploadUrl(
    fileName: string,
    contentType?: string,
    folder: string = 'uploads'
): Promise<SignedUrlResponse> {
    const request: SignedUrlRequest = {
        fileName,
        contentType,
        folder,
    };

    return post<SignedUrlResponse>(
        ENDPOINTS.storage.signedUrl,
        request
    );
}

/**
 * Get a signed download URL for private file access
 * 
 * Generates a temporary URL for accessing private files.
 * 
 * @param path - File path within storage bucket
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @returns Promise resolving to signed download URL
 * 
 * @example
 * ```typescript
 * const { signedUrl } = await getSignedDownloadUrl("private/document.pdf");
 * // Use signedUrl for download (expires in 1 hour)
 * ```
 */
export async function getSignedDownloadUrl(
    path: string,
    expiresIn: number = 3600
): Promise<{ signedUrl: string; expiresIn: number }> {
    return get<{ signedUrl: string; expiresIn: number }>(
        ENDPOINTS.storage.signedUrl,
        {
            params: { path, expires_in: expiresIn },
        }
    );
}

/**
 * Delete a file from storage
 * 
 * Permanently removes a file from the storage bucket.
 * 
 * @param path - File path within storage bucket
 * @returns Promise resolving when file is deleted
 * 
 * @example
 * ```typescript
 * await deleteFile("uploads/old-image.png");
 * ```
 */
export async function deleteFile(
    path: string
): Promise<{ success: boolean; message: string }> {
    return del<{ success: boolean; message: string }>(
        ENDPOINTS.storage.deleteFile,
        {
            params: { path },
        }
    );
}

/**
 * List files in a folder
 * 
 * Retrieves a list of files in the specified folder.
 * 
 * @param folder - Folder path to list (empty string for root)
 * @param limit - Maximum number of files to return (default: 100)
 * @returns Promise resolving to file list
 * 
 * @example
 * ```typescript
 * const { files } = await listFiles("images", 50);
 * files.forEach(file => console.log(file.name));
 * ```
 */
export async function listFiles(
    folder: string = '',
    limit: number = 100
): Promise<FileListResponse> {
    return get<FileListResponse>(
        ENDPOINTS.storage.list,
        {
            params: { folder, limit },
        }
    );
}

/**
 * Get storage service info
 * 
 * Retrieves information about the storage service configuration.
 * 
 * @returns Promise resolving to service info
 */
export async function getStorageInfo(): Promise<{
    service: string;
    version: string;
    bucket: string;
    endpoints: Record<string, Record<string, string>>;
    max_file_size: string;
    supported_methods: string[];
}> {
    return get(ENDPOINTS.storage.base);
}
