import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { extractContent } from './content-extractor.ts';
import { analyzeWithOpenAI } from './openai-analyzer.ts';

console.log('=== SIMPLIFIED ANALYZE FUNCTION STARTING ===');

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
    
    const { content } = requestData;
    console.log('Content length:', content?.length);

    if (!content) {
      throw new Error('Content is required');
    }

    const startTime = Date.now();

    // Step 1: Extract content (URL or plain text)
    console.log('=== CONTENT EXTRACTION ===');
    const extractedText = await extractContent(content.trim());
    console.log('Extracted text length:', extractedText.length);

    // Step 2: Analyze with OpenAI
    console.log('=== AI ANALYSIS ===');
    const analysis = await analyzeWithOpenAI(extractedText);

    console.log('=== ANALYSIS COMPLETE ===');
    console.log('Processing time:', Date.now() - startTime, 'ms');

    const response = {
      ...analysis,
      sourceInfo: {
        sourceUrl: content.trim().startsWith('http') ? content.trim() : undefined,
        contentType: 'text',
        originalContent: !content.trim().startsWith('http') 
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