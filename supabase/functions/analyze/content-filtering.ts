import { filterTwitterContent } from './twitter-handlers.ts';

export function filterMeaningfulContent(rawContent: string, contentType: string, url: string): string {
  let content = rawContent;
  
  const commonNoisePatterns = [
    /Don't miss what's happening[\s\S]*?People on X are the first to know\.?/gi,
    /Don't miss what's happening/gi,
    /People on X are the first to know\.?/gi,
    /People on Twitter are the first to know\.?/gi,
    /Join the conversation/gi,
    /What's happening\?/gi,
    /Trending/gi,
    /Who to follow/gi,
    /More Tweets/gi,
    /X\s*\n\s*={3,}/gi,
    /={10,}/gi,
    /Create new account/gi,
    /Use phone or email/gi,
    /Forgot password\?/gi,
    /Meta © \d{4}/gi,
    /About · Help · Press · API · Jobs · Privacy · Terms/gi,
    /Subscribe for more/gi,
    /Like and subscribe/gi,
    /Turn on notifications/gi,
    /© \d{4} Google LLC/gi,
    /YouTube Premium/gi,
    /YouTube TV/gi,
    /YouTube Music/gi,
    /Creator Studio/gi,
    /For You/gi,
    /Following/gi,
    /Live/gi,
    /Upload/gi,
    /TikTok for Good/gi,
    /ByteDance/gi,
    /What's on your mind\?/gi,
    /Facebook © \d{4}/gi,
    /Meta Platforms, Inc\./gi,
    /\[?Log in\]?[\s\S]*?\[?Sign up\]?/gi,
    /New to [\w\s]+\?[\s\S]*?Sign up now/gi,
    /\[?Create account\]?/gi,
    /Already have an account\?/gi,
    /Forgot your password\?/gi,
    /\[?\s*Post\s*\]?[\s\n\-=]*$/gmi,
    /\[?\s*See new posts\s*\]?/gi,
    /\[?\s*Conversation\s*\]?[\s\n\-=]*/gmi,
    /Something went wrong\.?\s*Try reloading\.?\s*Retry?/gi,
    /Try again/gi,
    /Reload/gi,
    /Loading\.\.\./gi,
    /Terms of Service[\s\S]*?Privacy Policy[\s\S]*?Cookie Policy/gi,
    /Terms[\s\|]*Privacy[\s\|]*Cookies/gi,
    /Help[\s\|]*About[\s\|]*Press/gi,
    /©\s*\d{4}[\s\w\.]*/gi,
    /All rights reserved/gi,
    /Like[\s\|]*Share[\s\|]*Comment/gi,
    /Follow us on/gi,
    /Download the app/gi,
    /Get the app/gi,
    /Available on/gi,
    /App Store[\s\|]*Google Play/gi,
    /\[Image \d+:[\s\S]*?\]/gi,
    /^\s*[-=]+\s*$/gm,
    /^\s*[|\-\s]+$/gm,
    /\s*•\s*/g,
    /\|\s*$/gm,
    /More$/gm,
  ];
  
  commonNoisePatterns.forEach(pattern => {
    content = content.replace(pattern, ' ');
  });
  
  if (contentType === 'twitter') {
    content = filterTwitterContent(content, url);
  } else if (contentType === 'tiktok') {
    content = filterTikTokContent(content, url);
  } else if (contentType === 'youtube') {
    content = filterYouTubeContent(content, url);
  }
  
  content = content
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\[\]\s*\(\s*\)/g, '')
    .trim();
  
  console.log(`🧹 Content filtered: ${rawContent.length} → ${content.length} chars`);
  return content;
}

function filterTikTokContent(content: string, url: string): string {
  let cleanContent = content;
  
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
  
  cleanContent = cleanContent
    .replace(/\d+[\.\d]*[KM]? likes?/gi, '')
    .replace(/\d+[\.\d]*[KM]? comments?/gi, '')
    .replace(/\d+[\.\d]*[KM]? shares?/gi, '')
    .replace(/#[\w]+/g, '')
    .trim();
  
  return cleanContent;
}

function filterYouTubeContent(content: string, url: string): string {
  let cleanContent = content;
  
  const titlePattern = /^([^|\n]{10,100})\s*[-|]\s*YouTube/;
  const titleMatch = content.match(titlePattern);
  if (titleMatch) {
    cleanContent = titleMatch[1].trim();
    console.log('📝 Extracted YouTube title');
  }
  
  cleanContent = cleanContent
    .replace(/\d+[\.,\d]*\s*views?/gi, '')
    .replace(/Subscribe[\s\S]*?notifications/gi, '')
    .replace(/Like[\s\S]*?Share[\s\S]*?Download/gi, '')
    .trim();
  
  return cleanContent;
}