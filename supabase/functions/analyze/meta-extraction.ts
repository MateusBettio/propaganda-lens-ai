export function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};
  
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

export function getBestThumbnail(metaTags: Record<string, string>, baseUrl: string): string | null {
  const thumbnailFields = [
    'og:image',
    'twitter:image',
    'twitter:image:src',
    'og:image:url'
  ];
  
  for (const field of thumbnailFields) {
    if (metaTags[field]) {
      let thumbnailUrl = metaTags[field];
      
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