import { ExtractedContent } from './types.ts';
import { isImageUrl, extractTwitterId, extractTikTokVideoId, extractYouTubeVideoId } from './utils.ts';
import { filterMeaningfulContent } from './content-filtering.ts';
import { generateTwitterEmbedUrl, generateTwitterEmbedHtml } from './twitter-handlers.ts';

// Jina fallback extraction
export async function extractWithJina(url: string, detectedType: string): Promise<ExtractedContent> {
  try {
    console.log('Using Jina Reader as fallback');
    const jinaUrl = `https://r.jina.ai/${url}`;
    const JINA_API_KEY = Deno.env.get('JINA_API_KEY');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-With-Generated-Alt': 'true',
    };
    
    if (JINA_API_KEY) {
      headers['Authorization'] = `Bearer ${JINA_API_KEY}`;
    }

    const response = await fetch(jinaUrl, { 
      headers,
      signal: AbortSignal.timeout(8000) // Reduced timeout for faster response
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
      
      // Generate embed URL and HTML for Twitter
      result.embedUrl = generateTwitterEmbedUrl(url);
      result.embedHtml = generateTwitterEmbedHtml(url, result.tweetId);
      
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
        try {
          // Use a simple approach - try to construct a generic Twitter card preview
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
    
    // Enhanced YouTube handling with Jina
    if (detectedType === 'youtube') {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        // Try to get transcript even when using Jina fallback
        try {
          // Import extractVideoTranscript here to avoid circular dependency
          const { extractVideoTranscript } = await import('./video-transcription.ts');
          const transcript = await extractVideoTranscript(url, 'youtube', videoId);
          if (transcript) {
            result.transcript = transcript;
            result.content = transcript;
            result.preview = transcript.substring(0, 300) + (transcript.length > 300 ? '...' : '');
            result.contentLength = transcript.length;
          }
        } catch (transcriptError) {
          console.log('Transcript extraction failed during Jina fallback:', transcriptError);
        }
        // Always set YouTube thumbnail
        result.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        result.videoId = videoId;
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
    
    // Still try to extract IDs and embed URLs even on error
    if (detectedType === 'twitter') {
      finalResult.tweetId = extractTwitterId(url);
      finalResult.thumbnail = `https://abs.twimg.com/errors/logo46x38.png`;
      // Generate embed URL and HTML even on error
      finalResult.embedUrl = generateTwitterEmbedUrl(url);
      finalResult.embedHtml = generateTwitterEmbedHtml(url, finalResult.tweetId);
    } else if (detectedType === 'tiktok') {
      finalResult.videoId = extractTikTokVideoId(url);
    }
    
    return finalResult;
  }
}