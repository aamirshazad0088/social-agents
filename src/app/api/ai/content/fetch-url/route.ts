import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL. Please provide a valid HTTP or HTTPS URL.' },
        { status: 400 }
      );
    }

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return NextResponse.json(
        { error: 'URL must point to an HTML page or text content.' },
        { status: 400 }
      );
    }

    const html = await response.text();
    
    // Extract text content from HTML
    const extractedText = extractTextFromHTML(html);
    
    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful content from the URL.' },
        { status: 400 }
      );
    }

    // Get page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;

    return NextResponse.json({
      success: true,
      text: extractedText,
      title,
      url: url,
    });
  } catch (error) {
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out. The URL took too long to respond.' },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch URL content' },
      { status: 500 }
    );
  }
}

/**
 * Extract readable text content from HTML
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags and their content
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

  // Try to extract main content areas first
  const mainContentMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                           text.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                           text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  
  if (mainContentMatch) {
    text = mainContentMatch[1];
  }

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ');
  
  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
  
  // Limit content length
  const maxLength = 50000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n\n[Content truncated due to length...]';
  }
  
  return text;
}
