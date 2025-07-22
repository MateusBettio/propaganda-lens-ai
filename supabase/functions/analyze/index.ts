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
  type: 'youtube' | 'webpage' | 'image' | 'text' | 'twitter' | 'instagram' | 'facebook' | 'tiktok';
  content?: string;
  transcript?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  imageUrl?: string;
  videoId?: string;
  postId?: string;
  tweetId?: string;
  preview: string;
  contentLength: number;
  extractionMethod: 'jina' | 'youtube' | 'meta-tags' | 'custom';
  error?: string;
}

interface AnalysisResult {
  quickAssessment: string;
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

// Enhanced content type detection
function detectContentType(url: string): 'youtube' | 'twitter' | 'tiktok' | 'image' | 'url' {
  const patterns = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    twitter: /(?:twitter\.com|x\.com)/i,
    tiktok: /tiktok\.com/i,
    image: /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i,
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) {
      return type as any;
    }
  }
  
  return 'url';
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

// ID extraction functions
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTwitterId(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/);
  return match ? match[1] : null;
}

// Meta tags extraction
function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};
  
  // Extract Open Graph tags
  const ogMatches = html.match(/<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
  if (ogMatches) {
    ogMatches.forEach(match => {
      const propMatch = match.match(/property=["']og:([^"']+)["']/);
      const contentMatch = match.match(/content=["']([^"']+)["']/);
      if (propMatch && contentMatch) {
        metaTags[`og:${propMatch[1]}`] = contentMatch[1];
      }
    });
  }
  
  // Extract Twitter Card tags
  const twitterMatches = html.match(/<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
  if (twitterMatches) {
    twitterMatches.forEach(match => {
      const nameMatch = match.match(/name=["']twitter:([^"']+)["']/);
      const contentMatch = match.match(/content=["']([^"']+)["']/);
      if (nameMatch && contentMatch) {
        metaTags[`twitter:${nameMatch[1]}`] = contentMatch[1];
      }
    });
  }
  
  return metaTags;
}

// Get best thumbnail from meta tags
function getBestThumbnail(metaTags: Record<string, string>, baseUrl: string): string | null {
  const thumbnailFields = [
    'og:image',
    'twitter:image',
    'twitter:image:src',
    'og:image:url'
  ];
  
  for (const field of thumbnailFields) {
    if (metaTags[field]) {
      let thumbnailUrl = metaTags[field];
      
      // Handle relative URLs
      if (thumbnailUrl.startsWith('//')) {
        thumbnailUrl = 'https:' + thumbnailUrl;
      } else if (thumbnailUrl.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        thumbnailUrl = `${urlObj.protocol}//${urlObj.host}${thumbnailUrl}`;
      }
      
      console.log('✅ Found thumbnail:', thumbnailUrl, 'from', field);
      return thumbnailUrl;
    }
  }
  
  return null;
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

// Enhanced content extraction with comprehensive social media support
async function extractContent(url: string): Promise<ExtractedContent> {
  console.log('=== EXTRACTING CONTENT ===');
  console.log('URL:', url);
  
  const contentType = detectContentType(url);
  console.log('🔍 Detected content type:', contentType);
  
  try {
    if (contentType === 'youtube') {
      console.log('YouTube URL detected');
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      return {
        type: 'youtube',
        videoId: videoId,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        preview: `YouTube video (ID: ${videoId})`,
        content: 'YouTube video content - thumbnail available',
        contentLength: 50,
        extractionMethod: 'youtube'
      };
    } 
    
    if (contentType === 'image') {
      console.log('Direct image URL detected');
      return {
        type: 'image',
        imageUrl: url,
        thumbnail: url,
        preview: 'Image content',
        content: 'Direct image URL',
        contentLength: 20,
        extractionMethod: 'custom'
      };
    }
    
    // For all other URLs (Twitter, TikTok, Instagram, Facebook, general web), fetch and extract meta tags
    console.log('Fetching HTML for meta tag extraction...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropagandaLens/2.0)'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`HTTP ${response.status} - trying fallback with Jina`);
      // Fallback to Jina for content extraction
      return await extractWithJina(url, contentType);
    }
    
    const html = await response.text();
    const metaTags = extractMetaTags(html);
    const thumbnail = getBestThumbnail(metaTags, url);
    
    // Extract title from meta tags or HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = metaTags['og:title'] || metaTags['twitter:title'] || (titleMatch ? titleMatch[1].trim() : '');
    
    // Extract description
    const description = metaTags['og:description'] || metaTags['twitter:description'];
    
    // Extract basic text content
    let rawTextContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Determine content type for filtering
    const filterType = contentType === 'twitter' ? 'twitter' : 
                      contentType === 'tiktok' ? 'tiktok' :
                      url.includes('instagram.com') ? 'instagram' :
                      url.includes('facebook.com') ? 'facebook' : 'webpage';
    
    // Apply intelligent content filtering
    const filteredTextContent = filterMeaningfulContent(rawTextContent, filterType, url);
    
    const result: ExtractedContent = {
      type: filterType,
      title,
      description,
      thumbnail,
      content: filteredTextContent,
      preview: description || filteredTextContent.substring(0, 500) + (filteredTextContent.length > 500 ? '...' : ''),
      contentLength: filteredTextContent.length,
      extractionMethod: 'meta-tags'
    };
    
    // Add platform-specific IDs
    if (contentType === 'twitter') {
      result.tweetId = extractTwitterId(url);
    } else if (contentType === 'tiktok') {
      result.videoId = extractTikTokVideoId(url);
    } else if (url.includes('instagram.com')) {
      result.postId = extractInstagramPostId(url);
    }
    
    console.log('✅ Content extracted:', {
      type: result.type,
      hasThumbnail: !!result.thumbnail,
      hasTitle: !!result.title,
      contentLength: result.contentLength
    });
    
    return result;
    
  } catch (error) {
    console.error('Direct extraction failed, trying Jina fallback:', error);
    return await extractWithJina(url, contentType);
  }
}

// Smart content filtering to extract meaningful content
function filterMeaningfulContent(rawContent: string, contentType: string, url: string): string {
  let content = rawContent;
  
  // Remove common structural elements across all platforms
  const commonNoisePatterns = [
    // X/Twitter platform noise
    /Don't miss what's happening/gi,
    /People on X are the first to know\.?/gi,
    /People on Twitter are the first to know\.?/gi,
    /Join the conversation/gi,
    /What's happening\?/gi,
    /Trending/gi,
    /Who to follow/gi,
    /More Tweets/gi,
    
    // Instagram platform noise
    /Create new account/gi,
    /Use phone or email/gi,
    /Forgot password\?/gi,
    /Meta © \d{4}/gi,
    /About · Help · Press · API · Jobs · Privacy · Terms/gi,
    
    // YouTube platform noise
    /Subscribe for more/gi,
    /Like and subscribe/gi,
    /Turn on notifications/gi,
    /© \d{4} Google LLC/gi,
    /YouTube Premium/gi,
    /YouTube TV/gi,
    /YouTube Music/gi,
    /Creator Studio/gi,
    
    // TikTok platform noise
    /For You/gi,
    /Following/gi,
    /Live/gi,
    /Upload/gi,
    /TikTok for Good/gi,
    /ByteDance/gi,
    
    // Facebook platform noise
    /What's on your mind\?/gi,
    /Facebook © \d{4}/gi,
    /Meta Platforms, Inc\./gi,
    
    // Universal platform noise
    /\[?Log in\]?[\s\S]*?\[?Sign up\]?/gi,
    /New to [\w\s]+\?[\s\S]*?Sign up now/gi,
    /\[?Create account\]?/gi,
    /Already have an account\?/gi,
    /Forgot your password\?/gi,
    
    // Navigation and UI elements
    /\[?\s*Post\s*\]?[\s\n\-=]*$/gmi,
    /\[?\s*See new posts\s*\]?/gi,
    /\[?\s*Conversation\s*\]?[\s\n\-=]*/gmi,
    /Something went wrong\.?\s*Try reloading\.?\s*Retry?/gi,
    /Try again/gi,
    /Reload/gi,
    /Loading\.\.\./gi,
    
    // Footer and legal elements
    /Terms of Service[\s\S]*?Privacy Policy[\s\S]*?Cookie Policy/gi,
    /Terms[\s\|]*Privacy[\s\|]*Cookies/gi,
    /Help[\s\|]*About[\s\|]*Press/gi,
    /©\s*\d{4}[\s\w\.]*/gi,
    /All rights reserved/gi,
    
    // Engagement prompts
    /Like[\s\|]*Share[\s\|]*Comment/gi,
    /Follow us on/gi,
    /Download the app/gi,
    /Get the app/gi,
    /Available on/gi,
    /App Store[\s\|]*Google Play/gi,
    
    // Generic noise
    /\[Image \d+:[\s\S]*?\]/gi, // Image alt text descriptions
    /^\s*[-=]+\s*$/gm, // Separator lines
    /^\s*[|\-\s]+$/gm, // Pipe separators
    /\s*•\s*/g, // Bullet points used as separators
    /\|\s*$/gm, // Trailing pipe characters
    /More$/gm, // Trailing "More" links
  ];
  
  // Apply common filters
  commonNoisePatterns.forEach(pattern => {
    content = content.replace(pattern, ' ');
  });
  
  // Platform-specific content extraction
  if (contentType === 'twitter') {
    content = filterTwitterContent(content, url);
  } else if (contentType === 'tiktok') {
    content = filterTikTokContent(content, url);
  } else if (contentType === 'youtube') {
    content = filterYouTubeContent(content, url);
  }
  
  // Clean up whitespace and formatting
  content = content
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\s+|\s+$/g, '') // Trim
    .replace(/\[\]\s*\(\s*\)/g, '') // Remove empty markdown links
    .trim();
  
  console.log(`🧹 Content filtered: ${rawContent.length} → ${content.length} chars`);
  return content;
}

// Twitter-specific content filtering
function filterTwitterContent(content: string, url: string): string {
  let cleanContent = content;
  
  // More aggressive pattern matching for tweet content
  // Pattern 1: Look for the actual tweet content in quotes
  const quotePattern = /"([^"]{5,})"/g;
  const quoteMatches = [...content.matchAll(quotePattern)];
  if (quoteMatches.length > 0) {
    // Find the longest meaningful quote (likely the tweet text)
    const meaningfulQuotes = quoteMatches.filter(match => 
      !match[1].includes('Log in') && 
      !match[1].includes('Sign up') &&
      !match[1].includes('Create account') &&
      match[1].length > 5
    );
    if (meaningfulQuotes.length > 0) {
      const longestQuote = meaningfulQuotes.reduce((a, b) => a[1].length > b[1].length ? a : b);
      cleanContent = longestQuote[1];
      console.log('📝 Extracted tweet text via quotes');
    }
  } else {
    // Pattern 2: Look for content between username and timestamp
    const usernamePattern = /@[\w]+\s*\n\s*([^[\n]*?)(?:\n|\[|$)/s;
    const usernameMatch = content.match(usernamePattern);
    if (usernameMatch && usernameMatch[1] && usernameMatch[1].trim().length > 10) {
      cleanContent = usernameMatch[1].trim();
      console.log('📝 Extracted tweet text via username pattern');
    } else {
      // Pattern 3: Look for the main content after removing all known noise
      const lines = content.split('\n');
      const meaningfulLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 5 && 
               !trimmed.includes('Log in') &&
               !trimmed.includes('Sign up') &&
               !trimmed.includes('Create account') &&
               !trimmed.includes('People on X') &&
               !trimmed.includes('Don\'t miss what\'s happening') &&
               !trimmed.includes('See new posts') &&
               !trimmed.includes('Something went wrong') &&
               !trimmed.match(/^\d+[KM]?\s*(replies?|retweets?|likes?)$/i) &&
               !trimmed.match(/^[@#]\w+$/) &&
               !trimmed.includes('=====') &&
               !trimmed.includes('-----') &&
               !trimmed.includes('Conversation');
      });
      
      if (meaningfulLines.length > 0) {
        cleanContent = meaningfulLines.join(' ').trim();
        console.log('📝 Extracted tweet text via line filtering');
      }
    }
  }
  
  // Remove Twitter-specific noise patterns more aggressively
  const twitterNoisePatterns = [
    /\d+[\.\d]*[KM]?\s*(replies?|retweets?|likes?|views?)/gi,
    /Read \d+[\.\d]*[KM]? replies/gi,
    /\[Read \d+[\.\d]*[KM]? replies\]/gi,
    /Show this thread/gi,
    /Replying to @\w+/gi,
    /\d+:\d+ [AP]M · \w+ \d+, \d{4}/gi, // Timestamp patterns
    /^\s*@\w+\s*$/gm, // Standalone @ mentions
    /\s+·\s+/g, // Twitter's bullet separator
  ];
  
  twitterNoisePatterns.forEach(pattern => {
    cleanContent = cleanContent.replace(pattern, '');
  });
  
  return cleanContent.trim();
}

// TikTok-specific content filtering
function filterTikTokContent(content: string, url: string): string {
  let cleanContent = content;
  
  // Look for video description or caption
  const descriptionPatterns = [
    /@[\w\.]+\s*([^@#]*?)(?=[@#]|$)/,
    /TikTok.*?([^•]*?)•/,
    /"([^"]{10,})"/
  ];
  
  for (const pattern of descriptionPatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      cleanContent = match[1].trim();
      console.log('📝 Extracted TikTok description');
      break;
    }
  }
  
  // Remove TikTok-specific noise
  cleanContent = cleanContent
    .replace(/\d+[\.\d]*[KM]? likes?/gi, '')
    .replace(/\d+[\.\d]*[KM]? comments?/gi, '')
    .replace(/\d+[\.\d]*[KM]? shares?/gi, '')
    .replace(/#[\w]+/g, '') // Remove hashtags if they're just noise
    .trim();
  
  return cleanContent;
}

// YouTube-specific content filtering (when using general extraction)
function filterYouTubeContent(content: string, url: string): string {
  let cleanContent = content;
  
  // Look for video title and description
  const titlePattern = /^([^|\n]{10,100})\s*[-|]\s*YouTube/;
  const titleMatch = content.match(titlePattern);
  if (titleMatch) {
    cleanContent = titleMatch[1].trim();
    console.log('📝 Extracted YouTube title');
  }
  
  // Remove YouTube-specific noise
  cleanContent = cleanContent
    .replace(/\d+[\.,\d]*\s*views?/gi, '')
    .replace(/Subscribe[\s\S]*?notifications/gi, '')
    .replace(/Like[\s\S]*?Share[\s\S]*?Download/gi, '')
    .trim();
  
  return cleanContent;
}

// Jina fallback extraction
async function extractWithJina(url: string, detectedType: string): Promise<ExtractedContent> {
  try {
    console.log('Using Jina Reader as fallback');
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-With-Generated-Alt': 'true',
    };
    
    if (JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
    }

    const response = await fetch(jinaUrl, { 
      headers,
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.data?.content || data.content || '';
    const title = data.data?.title || data.title || '';
    
    // Apply intelligent content filtering
    const filteredContent = filterMeaningfulContent(rawContent, detectedType, url);
    
    const result: ExtractedContent = {
      type: detectedType === 'twitter' ? 'twitter' :
            detectedType === 'tiktok' ? 'tiktok' :
            isImageUrl(url) ? 'image' : 'webpage',
      content: filteredContent,
      title,
      preview: filteredContent.substring(0, 300) + (filteredContent.length > 300 ? '...' : ''),
      contentLength: filteredContent.length,
      extractionMethod: 'jina'
    };
    
    // Enhanced Twitter/X handling when using Jina fallback
    if (detectedType === 'twitter') {
      result.tweetId = extractTwitterId(url);
      console.log('🐦 Twitter detected with tweet ID:', result.tweetId);
      
      // Enhanced image extraction for X.com posts
      let foundThumbnail = null;
      
      // Method 1: Look for Twitter profile images (pbs.twimg.com) in original raw content
      const profileImageMatches = rawContent.match(/https:\/\/pbs\.twimg\.com\/profile_images\/[^\s\)"\]]+/gi);
      if (profileImageMatches && profileImageMatches.length > 0) {
        // Get the larger version by replacing _normal with _400x400 or removing _normal
        foundThumbnail = profileImageMatches[0].replace(/_normal\.(jpg|jpeg|png|gif|webp)/, '_400x400.$1');
        console.log('✅ Found Twitter profile image:', foundThumbnail);
      }
      
      // Method 2: Look for Twitter media images (pbs.twimg.com/media/)
      if (!foundThumbnail) {
        const mediaImageMatches = rawContent.match(/https:\/\/pbs\.twimg\.com\/media\/[^\s\)"\]]+/gi);
        if (mediaImageMatches && mediaImageMatches.length > 0) {
          foundThumbnail = mediaImageMatches[0];
          console.log('✅ Found Twitter media image:', foundThumbnail);
        }
      }
      
      // Method 3: Look for Twitter card images (twimg.com)
      if (!foundThumbnail) {
        const cardImageMatches = rawContent.match(/https:\/\/[^\/]*twimg\.com\/[^\s\)"\]]+\.(jpg|jpeg|png|gif|webp)/gi);
        if (cardImageMatches && cardImageMatches.length > 0) {
          foundThumbnail = cardImageMatches[0];
          console.log('✅ Found Twitter card image:', foundThumbnail);
        }
      }
      
      // Method 4: Look for any other image URLs in the content
      if (!foundThumbnail) {
        const genericImageMatches = rawContent.match(/https:\/\/[^\s\)"\]]+\.(jpg|jpeg|png|gif|webp)/gi);
        if (genericImageMatches && genericImageMatches.length > 0) {
          foundThumbnail = genericImageMatches[0];
          console.log('✅ Found generic image in Twitter content:', foundThumbnail);
        }
      }
      
      // Method 5: Try alternative thumbnail services for X.com
      if (!foundThumbnail && result.tweetId) {
        // Try using URL-to-image service as last resort before fallback
        try {
          // Use a simple approach - try to construct a generic Twitter card preview
          // This won't always work but is better than the logo
          foundThumbnail = `https://abs.twimg.com/favicons/twitter.2.ico`;
          console.log('🔄 Using Twitter favicon as minimal fallback');
        } catch (e) {
          console.log('Alternative thumbnail services failed');
        }
      }
      
      // Set the thumbnail or use fallback
      if (foundThumbnail) {
        result.thumbnail = foundThumbnail;
      } else {
        // Only use logo as last resort
        result.thumbnail = `https://abs.twimg.com/errors/logo46x38.png`;
        console.log('⚠️ No images found, using Twitter logo fallback');
      }
    }
    
    // Enhanced TikTok handling
    if (detectedType === 'tiktok') {
      result.videoId = extractTikTokVideoId(url);
      // TikTok thumbnails are hard to get without API, but we can try patterns
      if (result.videoId) {
        console.log('📱 TikTok detected with video ID:', result.videoId);
      }
    }
    
    return result;
    
  } catch (jinaError) {
    console.error('Jina fallback also failed:', jinaError);
    
    // Final fallback with platform-specific IDs if possible
    const finalResult: ExtractedContent = {
      type: detectedType === 'twitter' ? 'twitter' : 
            detectedType === 'tiktok' ? 'tiktok' : 'webpage',
      content: url,
      preview: `Content extraction failed. Using URL for analysis.`,
      contentLength: url.length,
      extractionMethod: 'custom',
      error: jinaError.message
    };
    
    // Still try to extract IDs even on error
    if (detectedType === 'twitter') {
      finalResult.tweetId = extractTwitterId(url);
      finalResult.thumbnail = `https://abs.twimg.com/errors/logo46x38.png`;
    } else if (detectedType === 'tiktok') {
      finalResult.videoId = extractTikTokVideoId(url);
    }
    
    return finalResult;
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
  "quickAssessment": "Brief assessment focusing on manipulative characteristics",
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