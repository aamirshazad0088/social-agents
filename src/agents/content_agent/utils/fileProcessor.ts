/**
 * File Processing Utilities for Multimodal Support
 * Handles images, PDFs, and documents for LangChain agents
 */

import { AttachmentInput } from '../schemas/content.schemas';

export interface ProcessedAttachment {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: string;
}

/**
 * Convert base64 data URL to pure base64
 */
export function extractBase64(dataUrl: string): string {
  if (dataUrl.includes(',')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

/**
 * Get MIME type from base64 data URL
 */
export function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/data:([^;]+);/);
  return match ? match[1] : 'application/octet-stream';
}

/**
 * Process PDF attachment (stub for now - will be implemented with LangChain loaders)
 */
export async function processPdfAttachment(attachment: AttachmentInput): Promise<string> {
  // This is a placeholder - actual PDF processing will be done in the agent service
  // using @langchain/community PDFLoader with Blob
  return `[PDF Document: ${attachment.name}]`;
}

/**
 * Process document attachment (DOCX, TXT, etc.)
 */
export async function processDocumentAttachment(attachment: AttachmentInput): Promise<string> {
  // Placeholder for document processing
  // Will use DocxLoader, TextLoader, etc. in the agent service
  return `[Document: ${attachment.name}]`;
}

/**
 * Process CSV attachment
 */
export async function processCsvAttachment(attachment: AttachmentInput): Promise<string> {
  try {
    const base64Data = extractBase64(attachment.data);
    const csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    return `CSV Data from ${attachment.name}:\n\`\`\`\n${csvContent}\n\`\`\``;
  } catch (error) {
    return `[CSV Document: ${attachment.name}]`;
  }
}

/**
 * Process JSON attachment
 */
export async function processJsonAttachment(attachment: AttachmentInput): Promise<string> {
  try {
    const base64Data = extractBase64(attachment.data);
    const jsonContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    const parsed = JSON.parse(jsonContent);
    return `JSON Data from ${attachment.name}:\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
  } catch (error) {
    return `[JSON Document: ${attachment.name}]`;
  }
}

/**
 * Process text attachment
 */
export async function processTextAttachment(attachment: AttachmentInput): Promise<string> {
  try {
    const base64Data = extractBase64(attachment.data);
    const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    return `Text from ${attachment.name}:\n\`\`\`\n${textContent}\n\`\`\``;
  } catch (error) {
    return `[Text Document: ${attachment.name}]`;
  }
}

/**
 * Process image attachment for vision models
 */
export function processImageAttachment(attachment: AttachmentInput): ProcessedAttachment {
  const base64Data = extractBase64(attachment.data);
  const mimeType = attachment.mimeType || getMimeType(attachment.data);
  
  return {
    type: 'image_url',
    image_url: `data:${mimeType};base64,${base64Data}`,
  };
}

/**
 * Process all attachments and convert to LangChain message content format
 */
export async function processAttachments(
  attachments: AttachmentInput[]
): Promise<ProcessedAttachment[]> {
  const processed: ProcessedAttachment[] = [];

  for (const attachment of attachments) {
    try {
      switch (attachment.type) {
        case 'image':
          processed.push(processImageAttachment(attachment));
          break;

        case 'pdf': {
          const pdfText = await processPdfAttachment(attachment);
          processed.push({
            type: 'text',
            text: pdfText,
          });
          break;
        }

        case 'csv': {
          const csvText = await processCsvAttachment(attachment);
          processed.push({
            type: 'text',
            text: csvText,
          });
          break;
        }

        case 'json': {
          const jsonText = await processJsonAttachment(attachment);
          processed.push({
            type: 'text',
            text: jsonText,
          });
          break;
        }

        case 'text': {
          const textContent = await processTextAttachment(attachment);
          processed.push({
            type: 'text',
            text: textContent,
          });
          break;
        }

        case 'document': {
          const docText = await processDocumentAttachment(attachment);
          processed.push({
            type: 'text',
            text: docText,
          });
          break;
        }

        default:
      }
    } catch (error) {
      processed.push({
        type: 'text',
        text: `[Error processing ${attachment.name}]`,
      });
    }
  }

  return processed;
}

/**
 * Check if model supports vision (multimodal)
 */
export function isVisionModel(modelName: string): boolean {
  const visionModels = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4-vision',
    'claude-3',
    'gemini-pro-vision',
  ];
  return visionModels.some(vm => modelName.toLowerCase().includes(vm));
}
