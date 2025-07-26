import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { fetchFromX } from '../shared/xFetcher.ts';
import { analyzeContentMultilingual } from '../shared/multilingualAnalyzer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending jobs (limit to 5 to avoid timeout)
    const { data: jobs, error: fetchError } = await supabase
      .from('extraction_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const job of jobs) {
      try {
        // Mark job as processing
        await supabase
          .from('extraction_jobs')
          .update({ 
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Determine platform and extract content
        let extractedContent;
        const url = new URL(job.url);
        const hostname = url.hostname.toLowerCase();
        
        if (hostname === 'twitter.com' || hostname === 'x.com' || 
            hostname === 'www.twitter.com' || hostname === 'www.x.com') {
          // Use our new Twitter/X handler
          extractedContent = await fetchFromX(job.url);
        } else {
          // Call the analyze endpoint for other platforms
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
          
          const response = await fetch(`${supabaseUrl}/functions/v1/analyze`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ content: job.url })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analyze endpoint failed: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          
          // Store the result and continue to next job
          await supabase
            .from('extraction_jobs')
            .update({ 
              status: 'completed',
              result: result,
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          await supabase
            .from('analysis')
            .insert({
              url: job.url,
              content: result.content || '',
              summary: result.summary || '',
              indicators: result.indicators || {},
              confidence: result.confidence || 0,
              metadata: result.sourceMetadata || {},
              created_at: new Date().toISOString()
            });

          results.push({ job_id: job.id, status: 'completed' });
          continue;
        }

        // For Twitter/X, run multilingual propaganda analysis
        const analysisResult = await analyzeContentMultilingual(
          extractedContent.text,
          {
            platform: 'twitter',
            thread_length: extractedContent.meta.thread?.length || 1,
            media_count: extractedContent.meta.media?.length || 0,
            extraction_method: 'twitter_api_v2',
            detected_language: extractedContent.meta.language,
            language_confidence: extractedContent.meta.languageConfidence,
            original_tweet_lang: extractedContent.meta.originalTweetLang
          }
        );

        // Store the result
        await supabase
          .from('extraction_jobs')
          .update({ 
            status: 'completed',
            result: analysisResult,
            detected_language: analysisResult.language,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Also store in analysis table for historical records
        await supabase
          .from('analysis')
          .insert({
            url: job.url,
            content: analysisResult.content,
            summary: analysisResult.summary,
            indicators: analysisResult.indicators,
            confidence: analysisResult.confidence,
            metadata: analysisResult.sourceMetadata,
            language: analysisResult.language,
            language_confidence: analysisResult.sourceMetadata.language_confidence || 0.5,
            created_at: new Date().toISOString()
          });

        results.push({ job_id: job.id, status: 'completed' });

      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        
        // Mark job as failed
        await supabase
          .from('extraction_jobs')
          .update({ 
            status: 'failed',
            error: jobError.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, status: 'failed', error: jobError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} jobs`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in worker function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});