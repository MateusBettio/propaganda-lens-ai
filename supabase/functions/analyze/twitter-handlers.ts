export function generateTwitterEmbedUrl(url: string): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://publish.twitter.com/oembed?url=${encodedUrl}&omit_script=true&dnt=true`;
}

export function generateTwitterEmbedHtml(url: string, tweetId: string | null): string {
  if (tweetId) {
    return `<iframe src="https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=light&conversation=none&cards=hidden&chrome=nofooter" width="100%" height="100%" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
  }
  const encodedUrl = encodeURIComponent(url);
  return `<iframe src="https://platform.twitter.com/embed/Tweet.html?url=${encodedUrl}&theme=light&conversation=none&cards=hidden&chrome=nofooter" width="100%" height="100%" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
}

export function filterTwitterContent(content: string, url: string): string {
  let cleanContent = content;
  
  const quotePattern = /"([^"]{5,})"/g;
  const quoteMatches = [...content.matchAll(quotePattern)];
  if (quoteMatches.length > 0) {
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
    const usernamePattern = /@[\w]+\s*\n\s*([^[\n]*?)(?:\n|\[|$)/s;
    const usernameMatch = content.match(usernamePattern);
    if (usernameMatch && usernameMatch[1] && usernameMatch[1].trim().length > 10) {
      cleanContent = usernameMatch[1].trim();
      console.log('📝 Extracted tweet text via username pattern');
    } else {
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
               !trimmed.includes('are the first to know') &&
               !trimmed.includes('X.com') &&
               !trimmed.includes('twitter.com') &&
               !trimmed.match(/^\d+[KM]?\s*(replies?|retweets?|likes?)$/i) &&
               !trimmed.match(/^[@#]\w+$/) &&
               !trimmed.includes('=====') &&
               !trimmed.includes('-----') &&
               !trimmed.includes('Conversation') &&
               !trimmed.match(/^X\s*$/i);
      });
      
      if (meaningfulLines.length > 0) {
        cleanContent = meaningfulLines.join(' ').trim();
        console.log('📝 Extracted tweet text via line filtering');
      }
    }
  }
  
  const twitterNoisePatterns = [
    /\d+[\.\d]*[KM]?\s*(replies?|retweets?|likes?|views?)/gi,
    /Read \d+[\.\d]*[KM]? replies/gi,
    /\[Read \d+[\.\d]*[KM]? replies\]/gi,
    /Show this thread/gi,
    /Replying to @\w+/gi,
    /\d+:\d+ [AP]M · \w+ \d+, \d{4}/gi,
    /^\s*@\w+\s*$/gm,
    /\s+·\s+/g,
  ];
  
  twitterNoisePatterns.forEach(pattern => {
    cleanContent = cleanContent.replace(pattern, '');
  });
  
  return cleanContent.trim();
}