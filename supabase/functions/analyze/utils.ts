export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export function detectContentType(url: string): 'youtube' | 'twitter' | 'tiktok' | 'image' | 'url' {
  const patterns = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    twitter: /(?:twitter\.com|x\.com)/i,
    tiktok: /tiktok\.com/i,
    image: /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i,
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(url)) {
      return type as 'youtube' | 'twitter' | 'tiktok' | 'image';
    }
  }
  
  return 'url';
}

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

export function extractYouTubeVideoId(url: string): string | null {
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

export function extractTwitterId(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

export function extractInstagramPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/);
  return match ? match[1] : null;
}

export function createSafeHash(content: string): string {
  try {
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