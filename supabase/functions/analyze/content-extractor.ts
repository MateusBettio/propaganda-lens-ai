import { ExtractedContent } from './types.ts';
import { 
  detectContentType, 
  extractYouTubeVideoId, 
  extractTwitterId,
  extractTikTokVideoId,
  extractInstagramPostId,
  isImageUrl 
} from './utils.ts';
import { extractMetaTags, getBestThumbnail } from './meta-extraction.ts';
import { generateTwitterEmbedUrl, generateTwitterEmbedHtml } from './twitter-handlers.ts';
import { filterMeaningfulContent } from './content-filtering.ts';
import { extractVideoTranscript } from './video-transcription.ts';
import { extractWithJina } from './jina-extractor.ts';

export async function extractContent(url: string): Promise<ExtractedContent> {
  console.log('=== EXTRACTING CONTENT ===');
  console.log('URL:', url);
  
  const contentType = detectContentType(url);
  console.log('🔍 Detected content type:', contentType);
  
  try {
    if (contentType === 'twitter') {
      console.log('⚡ Fast path for Twitter/X URL');
      const tweetId = extractTwitterId(url);
      
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PropagandaLens/2.0)'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const html = await response.text();
          const metaTags = extractMetaTags(html);
          const thumbnail = getBestThumbnail(metaTags, url);
          const title = metaTags['og:title'] || metaTags['twitter:title'] || '';
          const description = metaTags['og:description'] || metaTags['twitter:description'] || '';
          
          let rawTextContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const filteredTextContent = filterMeaningfulContent(rawTextContent, 'twitter', url);
          
          const embedUrl = generateTwitterEmbedUrl(url);
          const embedHtml = generateTwitterEmbedHtml(url, tweetId);
          
          return {
            type: 'twitter',
            tweetId,
            title,
            description,
            thumbnail,
            content: filteredTextContent,
            preview: description || filteredTextContent.substring(0, 500) + (filteredTextContent.length > 500 ? '...' : ''),
            contentLength: filteredTextContent.length,
            extractionMethod: 'meta-tags',
            embedUrl: embedUrl,
            embedHtml: embedHtml
          };
        }
      } catch (quickError) {
        console.log('Quick extraction failed, using Jina fallback');
      }
      
      return await extractWithJina(url, contentType);
    }
    
    if (contentType === 'youtube') {
      console.log('YouTube URL detected');
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      const transcript = await extractVideoTranscript(url, 'youtube', videoId);
      
      return {
        type: 'youtube',
        videoId: videoId,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        preview: transcript ? transcript.substring(0, 300) + (transcript.length > 300 ? '...' : '') : `YouTube video (ID: ${videoId})`,
        content: transcript || 'YouTube video - transcript not available',
        transcript: transcript || undefined,
        contentLength: transcript ? transcript.length : 50,
        extractionMethod: transcript ? 'assemblyai-universal' : 'youtube-no-transcript'
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
    
    if (contentType === 'tiktok') {
      console.log('TikTok video detected - skipping transcription for speed');
      const videoId = extractTikTokVideoId(url);
      
      return {
        type: 'tiktok',
        videoId: videoId || undefined,
        content: 'TikTok video - transcript extraction disabled for performance',
        transcript: undefined,
        preview: 'TikTok video',
        contentLength: 50,
        extractionMethod: 'tiktok-no-transcript'
      };
    }
    
    if (url.includes('instagram.com') && (url.includes('/reel/') || url.includes('/p/') || url.includes('/tv/'))) {
      console.log('Instagram video/reel detected - skipping transcription for speed');
      const postId = extractInstagramPostId(url);
      
      return {
        type: 'instagram',
        postId: postId || undefined,
        content: 'Instagram video - transcript extraction disabled for performance',
        transcript: undefined,
        preview: 'Instagram video',
        contentLength: 50,
        extractionMethod: 'instagram-no-transcript'
      };
    }
    
    console.log('Fetching HTML for meta tag extraction...');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropagandaLens/2.0)'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`HTTP ${response.status} - trying fallback with Jina`);
      return await extractWithJina(url, contentType);
    }
    
    const html = await response.text();
    const metaTags = extractMetaTags(html);
    const thumbnail = getBestThumbnail(metaTags, url);
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = metaTags['og:title'] || metaTags['twitter:title'] || (titleMatch ? titleMatch[1].trim() : '');
    
    const description = metaTags['og:description'] || metaTags['twitter:description'];
    
    let rawTextContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const filterType = contentType === 'twitter' ? 'twitter' : 
                      contentType === 'tiktok' ? 'tiktok' :
                      url.includes('instagram.com') ? 'instagram' :
                      url.includes('facebook.com') ? 'facebook' : 'webpage';
    
    const filteredTextContent = filterMeaningfulContent(rawTextContent, filterType, url);
    
    const result: ExtractedContent = {
      type: filterType as ExtractedContent['type'],
      title,
      description,
      thumbnail,
      content: filteredTextContent,
      preview: description || filteredTextContent.substring(0, 500) + (filteredTextContent.length > 500 ? '...' : ''),
      contentLength: filteredTextContent.length,
      extractionMethod: 'meta-tags'
    };
    
    if (contentType === 'twitter') {
      result.tweetId = extractTwitterId(url);
      result.embedUrl = generateTwitterEmbedUrl(url);
      result.embedHtml = generateTwitterEmbedHtml(url, result.tweetId);
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