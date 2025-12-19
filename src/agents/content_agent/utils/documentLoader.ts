/**
 * Document and Image Loader for Content Strategist Chatbot
 * Handles images (primary), PDFs, and other document formats
 */

import { AttachmentInput } from '../schemas/content.schemas';

// Lazy load document parsing libraries to avoid build issues
let mammoth: { extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }> } | null = null;
let officeParser: { parseOfficeAsync: (buffer: Buffer) => Promise<string> } | null = null;

async function getMammoth(): Promise<{ extractRawText: (options: { buffer: Buffer }) => Promise<{ value: string }> }> {
  if (!mammoth) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mammoth = require('mammoth');
  }
  return mammoth!;
}

async function getOfficeParser(): Promise<{ parseOfficeAsync: (buffer: Buffer) => Promise<string> }> {
  if (!officeParser) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    officeParser = require('officeparser');
  }
  return officeParser!;
}

/**
 * Detect file type from attachment data, mime type, or extension
 * Images are prioritized for vision model processing
 */
export function detectFileType(attachment: AttachmentInput): 'image' | 'pdf' | 'docx' | 'pptx' | 'csv' | 'json' | 'text' | 'unknown' {
  // First check the type field directly
  if (attachment.type === 'image') return 'image';
  
  const mimeType = attachment.mimeType?.toLowerCase() || '';
  const fileName = attachment.name.toLowerCase();
  const data = attachment.data || '';
  
  // Check data URL prefix for images
  if (data.startsWith('data:image/')) return 'image';
  
  // Check MIME type - prioritize images
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
  if (mimeType.includes('csv')) return 'csv';
  if (mimeType.includes('json')) return 'json';
  if (mimeType.includes('text/plain')) return 'text';
  
  // Check extension
  if (fileName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|heic|heif)$/)) return 'image';
  if (fileName.endsWith('.pdf')) return 'pdf';
  if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return 'pptx';
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'docx';
  if (fileName.endsWith('.csv')) return 'csv';
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.txt')) return 'text';
  
  return 'unknown';
}

/**
 * Check if attachment is an image
 */
export function isImageAttachment(attachment: AttachmentInput): boolean {
  return detectFileType(attachment) === 'image';
}

/**
 * Get image data URL for vision model
 * Returns properly formatted data URL for OpenAI vision API
 */
export function getImageDataUrl(attachment: AttachmentInput): string {
  const data = attachment.data || '';
  
  // Already a data URL
  if (data.startsWith('data:')) {
    return data;
  }
  
  // Raw base64 - add data URL prefix
  const mimeType = attachment.mimeType || 'image/jpeg';
  return `data:${mimeType};base64,${data}`;
}

/**
 * Extract base64 data from data URL or raw base64
 */
export function extractBase64(data: string): string {
  if (data.includes(',')) {
    return data.split(',')[1];
  }
  return data;
}

/**
 * Get MIME type from attachment
 */
export function getMimeType(attachment: AttachmentInput): string {
  if (attachment.mimeType) {
    return attachment.mimeType;
  }
  
  const data = attachment.data || '';
  if (data.startsWith('data:')) {
    const match = data.match(/^data:([^;]+);/);
    if (match) return match[1];
  }
  
  // Guess from extension
  const ext = attachment.name.toLowerCase().split('.').pop();
  const mimeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'json': 'application/json',
    'csv': 'text/csv',
    'txt': 'text/plain',
  };
  
  return mimeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Load text-based document content
 */
export async function loadDocument(attachment: AttachmentInput): Promise<string> {
  const fileType = detectFileType(attachment);
  
  // Images should be handled separately via vision API, not as text
  if (fileType === 'image') {
    return `[Image: ${attachment.name}] - This image will be analyzed visually.`;
  }
  
  const base64Data = extractBase64(attachment.data || '');
  
  try {
    switch (fileType) {
      case 'csv': {
        const csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        return `CSV Data from ${attachment.name}:\n\`\`\`csv\n${csvContent}\n\`\`\``;
      }
      case 'json': {
        const jsonContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        const parsed = JSON.parse(jsonContent);
        return `JSON from ${attachment.name}:\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
      }
      case 'text': {
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        return `Text from ${attachment.name}:\n\`\`\`\n${textContent}\n\`\`\``;
      }
      case 'pdf': {
        try {
          
          const pdfBuffer = Buffer.from(base64Data, 'base64');
          
          if (pdfBuffer.length === 0) {
            return `[PDF Document: ${attachment.name}] - PDF file appears to be empty.`;
          }
          
          // Use unpdf which works in serverless environments (no canvas needed)
          const { extractText } = await import('unpdf');
          
          // Convert Buffer to Uint8Array as required by unpdf
          const pdfData = new Uint8Array(pdfBuffer);
          const { text: textArray, totalPages } = await extractText(pdfData);
          // unpdf returns text as array of strings (one per page)
          const textContent = Array.isArray(textArray) ? textArray.join('\n') : String(textArray || '');
          
          const cleanText = textContent.trim();
          
          if (cleanText.length === 0) {
            return `[PDF Document: ${attachment.name}] - PDF appears to be image-based or has no extractable text. If this is a scanned document, please try a different format.`;
          }
          
          // Limit content to avoid token limits (roughly 50k chars)
          const maxLength = 50000;
          const truncatedContent = cleanText.length > maxLength 
            ? cleanText.substring(0, maxLength) + '\n\n[... content truncated due to length ...]'
            : cleanText;
          
          return `PDF Document: ${attachment.name}\nPages: ${totalPages}\n\n--- Content ---\n${truncatedContent}`;
        } catch (pdfError: any) {
          return `[PDF Document: ${attachment.name}] - Unable to extract text from this PDF. Error: ${pdfError?.message || 'Unknown error'}`;
        }
      }
      case 'docx': {
        try {
          const docxBuffer = Buffer.from(base64Data, 'base64');
          const docParser = await getMammoth();
          const result = await docParser.extractRawText({ buffer: docxBuffer });
          const textContent = result.value.trim();
          
          if (textContent.length === 0) {
            return `[Word Document: ${attachment.name}] - Document appears to be empty or has no extractable text.`;
          }
          
          // Limit content to avoid token limits
          const maxLength = 50000;
          const truncatedContent = textContent.length > maxLength 
            ? textContent.substring(0, maxLength) + '\n\n[... content truncated due to length ...]'
            : textContent;
          
          return `Word Document: ${attachment.name}\n\n--- Content ---\n${truncatedContent}`;
        } catch (docxError) {
          return `[Word Document: ${attachment.name}] - Unable to extract text from this document.`;
        }
      }
      case 'pptx': {
        try {
          const pptxBuffer = Buffer.from(base64Data, 'base64');
          const parser = await getOfficeParser();
          const textContent = (await parser.parseOfficeAsync(pptxBuffer)).trim();
          
          if (textContent.length === 0) {
            return `[PowerPoint: ${attachment.name}] - Presentation appears to be empty or has no extractable text.`;
          }
          
          // Limit content to avoid token limits
          const maxLength = 50000;
          const truncatedContent = textContent.length > maxLength 
            ? textContent.substring(0, maxLength) + '\n\n[... content truncated due to length ...]'
            : textContent;
          
          return `PowerPoint Presentation: ${attachment.name}\n\n--- Content ---\n${truncatedContent}`;
        } catch (pptxError) {
          return `[PowerPoint: ${attachment.name}] - Unable to extract text from this presentation.`;
        }
      }
      default:
        return `[File: ${attachment.name}] - Unsupported format for text extraction.`;
    }
  } catch (error) {
    return `[Error loading ${attachment.name}]`;
  }
}
