import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get existing job first
    const { data: existing } = await supabase
      .from('extraction_jobs')
      .select('id, status, result, created_at')
      .eq('url', url)
      .single();

    if (existing) {
      // Check if job is recent (within last hour) and completed
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const jobCreated = new Date(existing.created_at);
      
      if (existing.status === 'completed' && existing.result && jobCreated > hourAgo) {
        // Return recent cached result
        return new Response(
          JSON.stringify({
            message: 'Using recent analysis result',
            job_id: existing.id,
            status: 'completed',
            cached: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (existing.status === 'pending' || existing.status === 'processing') {
        // Job already in queue
        return new Response(
          JSON.stringify({ 
            message: 'Extraction already in progress', 
            job_id: existing.id,
            status: existing.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If job is old or failed, reset it to pending
      const { data: updatedJob, error: updateError } = await supabase
        .from('extraction_jobs')
        .update({ 
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update existing job:', updateError);
        // Fall through to create new job
      } else {
        return new Response(
          JSON.stringify({ 
            message: 'Extraction job reset and queued',
            job_id: updatedJob.id,
            status: 'pending'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new extraction job (only if no existing job found)
    const { data: job, error } = await supabase
      .from('extraction_jobs')
      .upsert({ 
        url, 
        status: 'pending',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'url',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      // If it's still a duplicate error, try to get the existing job
      if (error.code === '23505') {
        const { data: existingJob } = await supabase
          .from('extraction_jobs')
          .select('id, status')
          .eq('url', url)
          .single();
        
        if (existingJob) {
          return new Response(
            JSON.stringify({ 
              message: 'Extraction job exists',
              job_id: existingJob.id,
              status: existingJob.status
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Extraction job created',
        job_id: job.id,
        status: 'pending'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});