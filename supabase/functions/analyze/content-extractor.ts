// Simplified content extractor - basic text extraction only

export async function extractContent(input: string): Promise<string> {
  // If it's already plain text, return as-is
  if (!isUrl(input)) {
    return input.trim();
  }

  // If it's a URL, fetch and extract text
  try {
    console.log('Fetching URL:', input);
    const response = await fetch(input, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropagandaLens/2.0)'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Basic HTML to text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text || text.length < 50) {
      throw new Error('Could not extract meaningful content from URL');
    }

    console.log('Extracted text length:', text.length);
    return text;
    
  } catch (error) {
    console.error('Content extraction failed:', error);
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function isUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}