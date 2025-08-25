import { ContentValidation } from './types.ts';

export function validateContentQuality(content: string, sourceUrl: string): ContentValidation {
  if (!content || content.trim().length < 10) {
    return { 
      isValid: false, 
      reason: 'No meaningful content extracted from the post.' 
    };
  }
  
  const videoWithoutTranscript = [
    'YouTube video - transcript not available',
    'TikTok video - transcript not available', 
    'Instagram video - transcript not available'
  ];
  
  if (videoWithoutTranscript.includes(content)) {
    return {
      isValid: false,
      reason: 'Video transcript extraction failed. Cannot analyze video content without accessible audio or captions.'
    };
  }
  
  const errorIndicators = [
    'error',
    'failed',
    'not available',
    'access denied',
    'forbidden',
    'unauthorized',
    'server error',
    'bad request',
    'not found',
    'timeout',
    'connection failed',
    'invalid',
    'malformed',
    'parsing error',
    'extraction failed'
  ];
  
  const contentLower = content.toLowerCase();
  const isErrorMessage = errorIndicators.some(indicator => 
    contentLower.includes(indicator) && content.length < 200
  );
  
  if (isErrorMessage) {
    return {
      isValid: false,
      reason: 'Content appears to be an error message or system notification rather than actual content to analyze.'
    };
  }

  const trimmedContent = content.trim().toLowerCase();
  
  const platformNoiseIndicators = [
    "don't miss what's happening",
    "people on x are the first to know",
    "join the conversation",
    "what's happening",
    "trending",
    "who to follow",
    "create new account",
    "use phone or email",
    "forgot password",
    "sign up",
    "log in",
    "create account",
    "terms of service",
    "privacy policy",
    "cookies policy",
    "redirecting",
    "loading",
    "please wait",
    "404",
    "page not found",
    "access denied"
  ];

  const totalWords = trimmedContent.split(/\s+/).length;
  let noiseWords = 0;
  
  platformNoiseIndicators.forEach(indicator => {
    if (trimmedContent.includes(indicator)) {
      noiseWords += indicator.split(/\s+/).length;
    }
  });

  if (totalWords > 0 && (noiseWords / totalWords) > 0.7) {
    return { 
      isValid: false, 
      reason: 'Content appears to be primarily platform interface elements rather than actual post content.' 
    };
  }

  const genericPatterns = [
    /^[\s\[\]()]+$/,
    /^[.\-=\s]*$/,
    /^\w{1,3}$$/,
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(trimmedContent)) {
      return { 
        isValid: false, 
        reason: 'Extracted content appears to be navigation elements or formatting rather than post content.' 
      };
    }
  }

  return { isValid: true };
}