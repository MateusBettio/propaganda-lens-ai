// Deno-compatible version of xFetcher for Edge Functions
import { detectLanguage } from './multilingualAnalyzer.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NormalisedContent {
  text: string;
  html: string;
  meta: {
    thread?: any[];
    media?: any[];
    language?: string;
    languageConfidence?: number;
    [key: string]: any;
  };
}

// Simple rate limiter for Deno
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.processing++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.processing--;
          this.processNext();
        }
      });

      if (this.processing < this.maxConcurrent) {
        this.processNext();
      }
    });
  }

  private processNext() {
    if (this.queue.length > 0 && this.processing < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

const limit = new RateLimiter(15); // 450 req / 15 min cap approximation

// Initialize Supabase client for caching
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache management functions
async function getCachedTweet(tweetId: string) {
  const { data, error } = await supabase
    .from('tweet_cache')
    .select('*')
    .eq('tweet_id', tweetId)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !data) {
    console.log('No valid cache found for tweet:', tweetId);
    return null;
  }
  
  return data;
}

async function cacheTweet(tweetId: string, tweetData: any, language?: string, languageConfidence?: number) {
  const { error } = await supabase
    .from('tweet_cache')
    .upsert({
      tweet_id: tweetId,
      tweet_data: tweetData,
      language: language,
      language_confidence: languageConfidence,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  
  if (error) {
    console.error('Failed to cache tweet:', error);
  } else {
    console.log('✅ Tweet cached successfully');
  }
}

// Native Twitter API v2 implementation for Deno
async function fetchTweetFromAPI(tweetId: string, bearerToken: string) {
  const url = `https://api.twitter.com/2/tweets/${tweetId}`;
  const params = new URLSearchParams({
    'expansions': 'author_id,attachments.media_keys,referenced_tweets.id',
    'media.fields': 'type,url,preview_image_url,duration_ms,variants,public_metrics',
    'tweet.fields': 'text,lang,created_at,conversation_id,referenced_tweets'
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'User-Agent': 'PropagandaLensBot/1.0'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Twitter API Error:', response.status, errorText);
    throw new Error(`Twitter API error: ${response.status}`);
  }

  return await response.json();
}

export async function fetchFromX(rawUrl: string): Promise<NormalisedContent> {
  const X_BEARER_TOKEN = Deno.env.get('X_BEARER_TOKEN');
  const ASSEMBLYAI_API_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
  
  console.log('🐦 Starting Twitter/X extraction for:', rawUrl);
  
  if (!X_BEARER_TOKEN) {
    throw new Error('X_BEARER_TOKEN not configured');
  }
  
  const id = rawUrl.split('/').pop()?.split('?')[0];
  if (!id) throw new Error('Invalid tweet URL');

  console.log('🔍 Extracted tweet ID:', id);

  // Check cache first to avoid rate limits
  const cachedTweet = await getCachedTweet(id);
  if (cachedTweet) {
    console.log('✅ Using cached tweet data');
    return await processTweetData(cachedTweet.tweet_data, rawUrl, ASSEMBLYAI_API_KEY, cachedTweet.language, cachedTweet.language_confidence);
  }

  try {
    // 1) Pull tweet data using native fetch
    console.log('📡 Fetching tweet from Twitter API...');
    const tweetData = await limit.add(() => fetchTweetFromAPI(id, X_BEARER_TOKEN));
    
    console.log('✅ Tweet data received:', JSON.stringify(tweetData, null, 2));
    
    // Process the fresh data and cache it
    const result = await processTweetData(tweetData, rawUrl, ASSEMBLYAI_API_KEY);
    
    // Cache the tweet data for future use
    await cacheTweet(id, tweetData, result.meta.language, result.meta.languageConfidence);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error in fetchFromX:', error);
    
    // If rate limited or API fails, try Jina Reader fallback
    if (error.message.includes('429') || error.message.includes('401') || error.message.includes('403')) {
      console.log('🔄 Twitter API failed, trying Jina Reader fallback...');
      return await fetchWithJinaFallback(rawUrl, Deno.env.get('JINA_API_KEY'));
    }
    
    // Provide more user-friendly error messages
    if (error.message.includes('429')) {
      throw new Error('Twitter API rate limit exceeded. Please try again in 15 minutes, or try a different tweet.');
    } else if (error.message.includes('401')) {
      throw new Error('Twitter API authentication failed. Please check the configuration.');
    } else if (error.message.includes('403')) {
      throw new Error('This tweet is private or restricted and cannot be accessed.');
    } else if (error.message.includes('404')) {
      throw new Error('Tweet not found. It may have been deleted or the URL is incorrect.');
    }
    
    throw error;
  }
}

// Jina Reader fallback for when Twitter API fails
async function fetchWithJinaFallback(rawUrl: string, jinaApiKey?: string): Promise<NormalisedContent> {
  console.log('🔄 Using Jina Reader fallback for:', rawUrl);
  
  if (!jinaApiKey) {
    console.log('❌ No Jina API key configured');
    throw new Error('Twitter API unavailable and no fallback configured');
  }
  
  try {
    const response = await fetch(`https://r.jina.ai/${rawUrl}`, {
      headers: {
        'Authorization': `Bearer ${jinaApiKey}`,
        'X-With-Generated-Alt': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`);
    }
    
    const content = await response.text();
    console.log('✅ Jina Reader extracted content length:', content.length);
    
    // Detect language
    const langDetection = detectLanguage(content);
    
    return {
      text: content,
      html: `<blockquote class="twitter-tweet"><a href="${rawUrl}"></a></blockquote>`,
      meta: {
        language: langDetection.language,
        languageConfidence: langDetection.confidence,
        extractionMethod: 'jina-fallback'
      }
    };
  } catch (error) {
    console.error('❌ Jina Reader fallback failed:', error);
    throw new Error('Both Twitter API and fallback extraction failed');
  }
}

// Process tweet data (shared between fresh API calls and cached data)
async function processTweetData(tweetData: any, rawUrl: string, assemblyAiKey?: string, cachedLanguage?: string, cachedLanguageConfidence?: number): Promise<NormalisedContent> {
  const tweet = tweetData.data;
  const includes = tweetData.includes || {};
  
  // For now, just get the main tweet (thread support can be added later)
  const thread: any[] = [tweet];
  
  // 2) Collate visible text
  const text = tweet.text || '';
  console.log('📝 Tweet text:', text);

  // 3) Handle media – run AssemblyAI on any video/audio URLs without caption tracks
  const mediaText: string[] = [];
  const media = includes?.media ?? [];
  
  console.log('🎬 Processing media attachments:', media.length);
  
  if (assemblyAiKey && media.length > 0) {
    for (const m of media) {
      if (['video', 'animated_gif'].includes(m.type)) {
        const mp4Variant = (m as any).variants?.find((v: any) => v.content_type?.includes('mp4'));
        if (mp4Variant?.url) {
          console.log('🎥 Found video variant, requesting transcription...');
          try {
            // Create transcript
            const createResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
              method: 'POST',
              headers: {
                'Authorization': assemblyAiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                audio_url: mp4Variant.url,
                summarization: false,
                entity_detection: false,
              }),
            });

            if (!createResponse.ok) {
              console.log('❌ AssemblyAI create failed:', createResponse.status);
              continue;
            }
            
            const { id: transcriptId } = await createResponse.json();
            console.log('✅ AssemblyAI transcript created:', transcriptId);
            
            // Poll for completion (simplified for now)  
            let status = 'processing';
            let attempts = 0;
            const maxAttempts = 10; // 20 seconds max to avoid timeout
            
            while ((status === 'processing' || status === 'queued') && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: { 'Authorization': assemblyAiKey },
              });
              
              if (pollResponse.ok) {
                const result = await pollResponse.json();
                status = result.status;
                
                if (status === 'completed' && result.text) {
                  console.log('✅ Transcription completed');
                  mediaText.push(result.text);
                  break;
                }
              }
              
              attempts++;
            }
            
            if (attempts >= maxAttempts) {
              console.log('⏰ Transcription timeout, continuing without media text');
            }
          } catch (error) {
            console.error('❌ AssemblyAI transcription error:', error);
            // Continue without transcription
          }
        }
      }
    }
  }

  // Combine all text content
  const fullText = [text, ...mediaText].filter(Boolean).join('\n\n---\n\n');
  
  console.log('📝 Combined text length:', fullText.length);
  
  // Use cached language detection if available, otherwise detect
  let langDetection;
  if (cachedLanguage && cachedLanguageConfidence) {
    langDetection = { language: cachedLanguage, confidence: cachedLanguageConfidence };
    console.log('🌍 Using cached language detection:', langDetection);
  } else {
    langDetection = detectLanguage(fullText);
    console.log('🌍 Fresh language detection result:', langDetection);
  }

  return {
    text: fullText,
    html: `<blockquote class="twitter-tweet"><a href="${rawUrl}"></a></blockquote>`,
    meta: { 
      thread, 
      media,
      language: langDetection.language,
      languageConfidence: langDetection.confidence,
      originalTweetLang: tweet.lang // Twitter's language detection
    },
  };
}