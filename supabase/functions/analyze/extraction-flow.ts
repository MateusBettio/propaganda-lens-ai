import { ExtractedContent, ExtractionFlowDescription } from './types.ts';

// Create user-friendly extraction flow description
export function createExtractionFlowDescription(
  isUrl: boolean,
  extractedContent: ExtractedContent | null,
  analyzedContent: string
): ExtractionFlowDescription {
  const steps: string[] = [];
  const contentInfo: {
    source: string;
    extractionMethod?: string;
    contentLength: number;
    hasTranscript?: boolean;
    thumbnailFound?: boolean;
  } = {
    source: isUrl ? 'URL' : 'Direct Text',
    contentLength: analyzedContent.length
  };

  if (!isUrl) {
    steps.push('📝 Received direct text input');
    steps.push('✅ Analyzed the provided text content');
    
    return {
      summary: 'Analyzed text that was directly provided (not from a URL)',
      steps,
      contentInfo
    };
  }

  // URL-based extraction flow
  steps.push('🔗 Detected URL input');
  
  if (extractedContent) {
    contentInfo.extractionMethod = extractedContent.extractionMethod;
    
    switch (extractedContent.type) {
      case 'youtube':
        steps.push('🎥 Identified as YouTube video');
        steps.push(`📊 Video ID extracted: ${extractedContent.videoId}`);
        
        if (extractedContent.transcript) {
          steps.push('📝 Successfully extracted video transcript');
          steps.push(`✅ Transcript length: ${extractedContent.transcript.length} characters`);
          if (extractedContent.extractionMethod === 'audio-whisper') {
            steps.push('🎵 Used audio extraction + Whisper AI transcription');
          } else {
            steps.push('📋 Used direct transcript API');
          }
          contentInfo.hasTranscript = true;
        } else {
          steps.push('❌ Could not extract video transcript');
          steps.push('⚠️ Both direct transcript APIs and audio extraction failed');
          contentInfo.hasTranscript = false;
        }
        
        if (extractedContent.thumbnail) {
          steps.push('🖼️ YouTube thumbnail URL generated');
          contentInfo.thumbnailFound = true;
        }
        break;
        
      case 'twitter':
        steps.push('🐦 Identified as Twitter/X post');
        steps.push(`🔍 Extraction method: ${extractedContent.extractionMethod}`);
        if (extractedContent.tweetId) {
          steps.push(`📊 Tweet ID extracted: ${extractedContent.tweetId}`);
        }
        steps.push('🧹 Applied Twitter-specific content filtering to remove platform noise');
        if (extractedContent.thumbnail) {
          steps.push('🖼️ Found image/thumbnail in tweet');
          contentInfo.thumbnailFound = true;
        }
        break;
        
      case 'tiktok':
        steps.push('📱 Identified as TikTok video');
        if (extractedContent.videoId) {
          steps.push(`📊 Video ID extracted: ${extractedContent.videoId}`);
        }
        
        if (extractedContent.transcript) {
          steps.push('📝 Successfully extracted video transcript');
          steps.push(`✅ Transcript length: ${extractedContent.transcript.length} characters`);
          steps.push('🎵 Used audio extraction + Whisper AI transcription');
          contentInfo.hasTranscript = true;
        } else {
          steps.push('❌ Could not extract video transcript');
          steps.push('⚠️ Audio extraction failed');
          contentInfo.hasTranscript = false;
        }
        
        steps.push(`🔍 Extraction method: ${extractedContent.extractionMethod}`);
        break;
        
      case 'instagram':
        steps.push('📸 Identified as Instagram post');
        if (extractedContent.postId) {
          steps.push(`📊 Post ID extracted: ${extractedContent.postId}`);
        }
        steps.push(`🔍 Extraction method: ${extractedContent.extractionMethod}`);
        steps.push('🧹 Applied Instagram-specific content filtering');
        break;
        
      case 'facebook':
        steps.push('📘 Identified as Facebook post');
        steps.push(`🔍 Extraction method: ${extractedContent.extractionMethod}`);
        steps.push('🧹 Applied Facebook-specific content filtering');
        break;
        
      case 'image':
        steps.push('🖼️ Identified as direct image URL');
        steps.push('✅ Image URL captured for analysis');
        contentInfo.thumbnailFound = true;
        break;
        
      case 'webpage':
        steps.push('🌐 Identified as general webpage/article');
        steps.push(`🔍 Extraction method: ${extractedContent.extractionMethod}`);
        if (extractedContent.title) {
          steps.push('📰 Extracted article title and meta information');
        }
        if (extractedContent.thumbnail) {
          steps.push('🖼️ Found Open Graph/meta image');
          contentInfo.thumbnailFound = true;
        }
        break;
    }
    
    // Add extraction method details
    switch (extractedContent.extractionMethod) {
      case 'meta-tags':
        steps.push('📋 Extracted content using meta tags and HTML parsing');
        break;
      case 'jina':
        steps.push('🤖 Used Jina Reader API for advanced content extraction');
        break;
      case 'youtube':
        steps.push('🎬 Used YouTube-specific extraction methods');
        break;
      case 'assemblyai-universal':
        steps.push('🎵 Used AssemblyAI Universal Transcription Service');
        steps.push('🌍 Works across ALL video platforms (YouTube, TikTok, Instagram, etc.)');
        steps.push('⚡ Real-time processing with 30-second response time');
        break;
      case 'audio-whisper':
        steps.push('🎵 Used audio extraction + OpenAI Whisper transcription');
        steps.push('🚫 Ban-resistant method that works across all video platforms');
        break;
      case 'custom':
        steps.push('🔧 Used custom extraction logic');
        break;
      case 'youtube-no-transcript':
      case 'tiktok-no-transcript':
      case 'instagram-no-transcript':
        steps.push('❌ Universal transcript extraction failed');
        steps.push('⚠️ AssemblyAI could not process video audio (may be private, muted, or inaccessible)');
        break;
    }
    
    if (extractedContent.error) {
      steps.push(`⚠️ Extraction warning: ${extractedContent.error}`);
    }
    
    steps.push(`📏 Final content length: ${contentInfo.contentLength} characters`);
    steps.push('🤖 Analyzed extracted content with OpenAI GPT-4');
  } else {
    steps.push('❌ Content extraction failed');
    steps.push('⚠️ Using URL as fallback for analysis');
  }
  
  // Create summary based on extraction success
  let summary = '';
  if (extractedContent?.type === 'youtube') {
    summary = extractedContent.transcript 
      ? 'Successfully extracted and analyzed YouTube video transcript'
      : 'YouTube video detected but transcript extraction failed';
  } else if (extractedContent) {
    summary = `Successfully extracted and analyzed content from ${extractedContent.type} source`;
  } else {
    summary = 'Content extraction failed, analysis may be limited';
  }
  
  return {
    summary,
    steps,
    contentInfo
  };
}