import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AnalysisRequest, AnalysisResult, ExtractedContent } from './types.ts';
import { isValidUrl } from './utils.ts';
import { extractContent } from './content-extractor.ts';
import { analyzeWithOpenAI } from './openai-analyzer.ts';
import { createExtractionFlowDescription } from './extraction-flow.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

console.log('=== ENVIRONMENT CHECK ===');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'MISSING');

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

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

    if (isValidUrl(content.trim())) {
      console.log('Valid URL detected, extracting content...');
      extractedContent = await extractContent(content.trim());
      
      console.log('=== EXTRACTION RESULT ===');
      console.log('Extracted content type:', extractedContent?.type);
      console.log('Extracted content length:', extractedContent?.content?.length || 0);
      console.log('Extracted content preview:', extractedContent?.content?.substring(0, 200) || 'NO CONTENT');
      console.log('=== END EXTRACTION RESULT ===');
      
      if (extractedContent.content) {
        analysisContent = extractedContent.content;
        console.log('✅ Using extracted content for analysis');
      } else {
        console.log('⚠️ No content extracted, using original URL');
      }
    } else {
      console.log('Not a URL, analyzing direct text');
    }

    const analysis = await analyzeWithOpenAI(analysisContent, extractedContent);

    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Processing time:', Date.now() - startTime, 'ms');

    const extractionFlow = createExtractionFlowDescription(
      isValidUrl(content.trim()),
      extractedContent,
      analysisContent
    );

    const response = {
      ...analysis,
      sourceInfo: {
        sourceUrl: isValidUrl(content.trim()) ? content.trim() : undefined,
        contentType: extractedContent?.type || contentType || 'text',
        extractedData: extractedContent,
        originalContent: !isValidUrl(content.trim()) 
          ? (content.length > 200 ? content.substring(0, 200) + '...' : content)
          : undefined
      },
      extractionFlow
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
      error: error.message
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