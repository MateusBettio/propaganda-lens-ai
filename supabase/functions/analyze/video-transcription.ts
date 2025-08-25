import { ExtractedContent } from './types.ts';

// Universal video transcript extraction using AssemblyAI with fallbacks
export async function extractVideoTranscript(
  videoUrl: string, 
  platform: string, 
  videoId?: string
): Promise<string | null> {
  console.log(`🎬 Extracting transcript from ${platform} video using universal transcription:`, videoUrl);
  
  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
  if (!ASSEMBLYAI_API_KEY) {
    console.log('❌ AssemblyAI API key not configured - trying platform-specific fallback');
    return await tryPlatformSpecificTranscript(videoUrl, platform, videoId);
  }
  
  try {
    // Step 1: Submit video URL for transcription (works with any platform)
    console.log('📤 Submitting video URL to AssemblyAI for transcription...');
    const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        speech_model: 'best',
        language_code: 'en',
        punctuate: true,
        format_text: true
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.log(`❌ AssemblyAI submission failed: ${submitResponse.status} - ${error}`);
      return null;
    }
    
    const submitResult = await submitResponse.json();
    const transcriptId = submitResult.id;
    console.log(`📋 Transcript ID: ${transcriptId}`);
    
    // Step 2: Poll for completion (real-time approach - max 30 seconds)
    console.log('⏳ Polling for transcript completion...');
    const maxWaitTime = 30000; // 30 seconds max
    const pollInterval = 2000;  // Check every 2 seconds
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < maxWaitTime) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!pollResponse.ok) {
        console.log(`❌ Polling failed: ${pollResponse.status}`);
        return null;
      }
      
      const result = await pollResponse.json();
      console.log(`📊 Status: ${result.status}`);
      
      if (result.status === 'completed') {
        if (result.text && result.text.length > 50) {
          console.log(`✅ Universal transcript extraction successful: ${result.text.length} characters`);
          console.log(`🎯 Platform: ${platform} | Confidence: ${result.confidence || 'N/A'}`);
          console.log(`📝 Preview: ${result.text.substring(0, 200)}...`);
          return result.text;
        } else {
          console.log('❌ Transcript completed but text is empty or too short');
          return null;
        }
      } else if (result.status === 'error') {
        console.log(`❌ AssemblyAI transcription failed: ${result.error}`);
        console.log('🔄 FALLBACK TRIGGERED: Trying platform-specific transcript extraction...');
        const fallbackResult = await tryPlatformSpecificTranscript(videoUrl, platform, videoId);
        console.log(`🔄 FALLBACK RESULT: ${fallbackResult ? 'SUCCESS' : 'FAILED'} - Length: ${fallbackResult?.length || 0}`);
        return fallbackResult;
      } else if (result.status === 'processing' || result.status === 'queued') {
        console.log(`⏳ Still ${result.status}... waiting ${pollInterval}ms`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    console.log('⏰ AssemblyAI timeout (30s) - trying platform-specific fallback...');
    return await tryPlatformSpecificTranscript(videoUrl, platform, videoId);
    
  } catch (error) {
    console.error('❌ AssemblyAI error:', error.message);
    console.log('🔄 Trying platform-specific fallback due to error...');
    return await tryPlatformSpecificTranscript(videoUrl, platform, videoId);
  }
}

// Platform-specific transcript extraction fallback (when AssemblyAI fails)
async function tryPlatformSpecificTranscript(
  videoUrl: string, 
  platform: string, 
  videoId?: string
): Promise<string | null> {
  console.log(`🔄 FALLBACK: Starting platform-specific transcript extraction`);
  console.log(`🔄 FALLBACK: Platform=${platform}, VideoId=${videoId}, URL=${videoUrl}`);
  
  if (platform === 'youtube' && videoId) {
    console.log(`🎬 FALLBACK: Processing YouTube video with ID: ${videoId}`);
    
    // Use YouTube's direct API as fallback
    const youtubeAPIs = [
      {
        name: 'YouTube Timedtext API',
        url: `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`
      },
      {
        name: 'YouTube Timedtext with Auto-Generated',
        url: `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&name=&kind=asr`
      }
    ];
    
    for (const api of youtubeAPIs) {
      try {
        console.log(`🔍 FALLBACK: Attempting ${api.name}: ${api.url}`);
        const response = await fetch(api.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/xml, application/xml, text/plain'
          },
          signal: AbortSignal.timeout(15000)
        });
        
        console.log(`🔍 FALLBACK: ${api.name} response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.text();
          console.log(`🔍 FALLBACK: ${api.name} response length: ${data.length}`);
          console.log(`🔍 FALLBACK: ${api.name} response preview: ${data.substring(0, 200)}...`);
          
          if (data && data.length > 50) {
            // Clean XML/HTML tags and extract text
            const cleanedData = data
              .replace(/<[^>]*>/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanedData.length > 50) {
              console.log(`✅ FALLBACK SUCCESS: ${api.name} extracted ${cleanedData.length} characters`);
              return cleanedData;
            } else {
              console.log(`⚠️ FALLBACK: ${api.name} returned data but content too short after cleaning`);
            }
          } else {
            console.log(`⚠️ FALLBACK: ${api.name} returned empty or very short response`);
          }
        } else {
          const errorText = await response.text().catch(() => 'Could not read error');
          console.log(`❌ FALLBACK: ${api.name} failed with ${response.status}: ${errorText.substring(0, 200)}`);
        }
      } catch (error) {
        console.log(`❌ FALLBACK: ${api.name} threw error: ${error.message}`);
      }
    }
    
    console.log(`❌ FALLBACK: All YouTube APIs failed for video ${videoId}`);
  } else {
    console.log(`❌ FALLBACK: No fallback available for platform ${platform} (only YouTube supported)`);
  }
  
  console.log(`❌ FALLBACK COMPLETE: No transcript found via platform-specific methods`);
  return null;
}