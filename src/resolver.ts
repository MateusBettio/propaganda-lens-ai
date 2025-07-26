import { fetchFromX } from './extractors/xFetcher';
import { NormalisedContent } from './types';

export async function resolveContent(url: string): Promise<NormalisedContent> {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();
  
  // Twitter/X handler
  if (hostname === 'twitter.com' || hostname === 'x.com' || hostname === 'www.twitter.com' || hostname === 'www.x.com') {
    return await fetchFromX(url);
  }
  
  // TODO: Add other platform handlers here
  // - YouTube handler
  // - TikTok handler
  // - Instagram/Facebook handler
  // - Generic web handler with Jina fallback
  
  throw new Error(`Platform not supported yet: ${hostname}`);
}