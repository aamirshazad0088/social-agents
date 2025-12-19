import { NextRequest, NextResponse } from 'next/server';
import { loadDocument, detectFileType } from '@/agents/content_agent/utils/documentLoader';

export async function POST(request: NextRequest) {
  try {
    const { file } = await request.json();
    
    if (!file || !file.data || !file.name) {
      return NextResponse.json(
        { error: 'File data and name are required' },
        { status: 400 }
      );
    }

    const attachment = {
      type: 'document' as const,
      name: file.name,
      data: file.data,
      mimeType: file.mimeType,
      size: file.size || 0,
    };

    const fileType = detectFileType(attachment);
    
    if (fileType === 'image') {
      return NextResponse.json(
        { error: 'Image files cannot be converted to text. Please upload a document.' },
        { status: 400 }
      );
    }

    if (fileType === 'unknown') {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, PPTX, TXT, CSV, or JSON files.' },
        { status: 400 }
      );
    }

    const extractedText = await loadDocument(attachment);
    
    // Clean up the extracted text (remove markdown formatting from loader)
    let cleanText = extractedText;
    
    // Remove loader prefixes like "PDF Document:", "Word Document:", etc.
    cleanText = cleanText.replace(/^(PDF Document|Word Document|PowerPoint Presentation|CSV Data from|JSON from|Text from)[^\n]*\n/i, '');
    cleanText = cleanText.replace(/^Pages: \d+\n/i, '');
    cleanText = cleanText.replace(/^--- Content ---\n/i, '');
    cleanText = cleanText.replace(/```(csv|json)?\n?/g, '');
    cleanText = cleanText.trim();

    return NextResponse.json({
      success: true,
      text: cleanText,
      fileType,
      fileName: file.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse document' },
      { status: 500 }
    );
  }
}
