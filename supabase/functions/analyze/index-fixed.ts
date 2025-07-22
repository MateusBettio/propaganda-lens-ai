import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Environment variables
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const JINA_API_KEY = Deno.env.get('JINA_API_KEY'); // Optional
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

console.log('=== ENVIRONMENT CHECK ===');
console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? 'Set' : 'MISSING');
console.log('JINA_API_KEY:', JINA_API_KEY ? 'Set' : 'Not set (optional)');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'MISSING');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

// Types
interface AnalysisRequest {
  content: string;
  contentType?: string;
}

interface ExtractedContent {
  type: 'youtube' | 'webpage' | 'image' | 'text';
  content?: string;
  transcript?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  imageUrl?: string;
  preview: string;
  contentLength: number;
  extractionMethod: 'jina' | 'youtube' | 'custom';
  error?: string;
}

interface AnalysisResult {
  quickAssessment: string;
  manipulationScore: number;
  techniques: Array<{
    name: string;
    description: string;
    confidence: 'low' | 'medium' | 'high';
    example: string;
  }>;
  counterPerspective: string;
  reflectionQuestions: string[];
}

// Helper Functions
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

// Fixed function to create safe hash for caching
function createSafeHash(content: string): string {
  try {
    // Create a simple hash from the content length and first/last chars
    const len = content.length;
    const first = content.charCodeAt(0) || 0;
    const last = content.charCodeAt(len - 1) || 0;
    const middle = content.charCodeAt(Math.floor(len / 2)) || 0;
    
    return `${len}_${first}_${middle}_${last}`;
  } catch (error) {
    console.warn('Hash creation failed, using timestamp:', error);
    return Date.now().toString();
  }
}

// Simplified content extraction for debugging
async function extractContent(url: string): Promise<ExtractedContent> {
  console.log('=== EXTRACTING CONTENT ===');
  console.log('URL:', url);
  
  try {
    if (isYouTubeUrl(url)) {
      console.log('YouTube URL detected');
      const videoId = getYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      // Return basic info for now - skip transcript extraction to avoid issues
      return {
        type: 'youtube',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        preview: 'YouTube video detected (transcript extraction temporarily disabled for debugging)',
        content: 'YouTube video content',
        contentLength: 100,
        extractionMethod: 'youtube'
      };
    } else {
      console.log('Regular URL detected, trying Jina Reader');
      
      // Try Jina Reader
      const jinaUrl = `https://r.jina.ai/${url}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'X-With-Generated-Alt': 'true',
      };
      
      if (JINA_API_KEY) {
        headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
        console.log('Using Jina API key');
      } else {
        console.log('Using Jina without API key (rate limited)');
      }

      const response = await fetch(jinaUrl, { 
        headers,
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      console.log('Jina response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.data?.content || data.content || '';
      const title = data.data?.title || data.title || '';
      
      console.log('Content extracted, length:', content.length);
      
      return {
        type: isImageUrl(url) ? 'image' : 'webpage',
        content: content,
        title: title,
        imageUrl: isImageUrl(url) ? url : undefined,
        preview: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
        contentLength: content.length,
        extractionMethod: 'jina'
      };
    }
  } catch (error) {
    console.error('Content extraction failed:', error);
    
    // Return fallback content instead of throwing
    return {
      type: 'webpage',
      content: url,
      preview: `Content extraction failed: ${error.message}. Using URL for analysis.`,
      contentLength: url.length,
      extractionMethod: 'custom',
      error: error.message
    };
  }
}

// Simplified OpenAI analysis
async function analyzeWithOpenAI(content: string, sourceInfo: any): Promise<AnalysisResult> {
  console.log('=== OPENAI ANALYSIS ===');
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  console.log('Content to analyze length:', content.length);
  console.log('Source info type:', sourceInfo?.type);

  const prompt = `Analyze this content for propaganda techniques and manipulation tactics.

Respond with ONLY valid JSON:
{
  "quickAssessment": "Brief assessment of manipulation level",
  "manipulationScore": 3,
  "techniques": [
    {
      "name": "Example Technique",
      "description": "How it's used",
      "confidence": "medium",
      "example": "Quote from content"
    }
  ],
  "counterPerspective": "Alternative viewpoint",
  "reflectionQuestions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ]
}

CONTENT: "${content.substring(0, 1000)}"`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a media literacy expert. Respond with ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content.trim();
    
    console.log('OpenAI response length:', responseText.length);
    
    try {
      const parsed = JSON.parse(responseText);
      console.log('JSON parsing successful');
      return parsed;
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw response:', responseText.substring(0, 500));
      throw new Error('Invalid JSON from OpenAI');
    }
  } catch (error) {
    console.error('OpenAI request failed:', error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  console.log('=== NEW REQUEST ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    console.log('=== PARSING REQUEST BODY ===');
    const body = await req.text();
    console.log('Raw body length:', body.length);
    
    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { content, contentType } = requestData as AnalysisRequest;
    console.log('Content length:', content?.length);
    console.log('Content type:', contentType);

    if (!content) {
      throw new Error('Content is required');
    }

    const startTime = Date.now();
    let extractedContent: ExtractedContent | null = null;
    let analysisContent = content;

    // Extract content if URL
    if (isValidUrl(content.trim())) {
      console.log('Valid URL detected, extracting content...');
      extractedContent = await extractContent(content.trim());
      
      if (extractedContent.content) {
        analysisContent = extractedContent.content;
      }
    } else {
      console.log('Not a URL, analyzing direct text');
    }

    // Analyze with OpenAI
    const analysis = await analyzeWithOpenAI(analysisContent, extractedContent);

    // Skip database storage for now to avoid caching issues
    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Processing time:', Date.now() - startTime, 'ms');

    // Return response
    const response = {
      ...analysis,
      sourceInfo: {
        sourceUrl: isValidUrl(content.trim()) ? content.trim() : undefined,
        contentType: extractedContent?.type || contentType || 'text',
        extractedData: extractedContent,
        originalContent: !isValidUrl(content.trim()) 
          ? (content.length > 200 ? content.substring(0, 200) + '...' : content)
          : undefined
      }
    };

    console.log('=== SUCCESS - RETURNING RESPONSE ===');
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const errorResponse = {
      error: 'Analysis failed',
      message: error.message,
      quickAssessment: "Technical error occurred during analysis",
      manipulationScore: 0,
      techniques: [],
      counterPerspective: "Unable to complete analysis due to technical issues",
      reflectionQuestions: [
        "Is this content from a reliable source?",
        "What verification can be done independently?",
        "Are there alternative sources to consult?"
      ]
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});