const { OpenAI } = require('openai');
const https = require('https');
const http = require('http');
const { parse } = require('url');

// Helper function to detect content type
function detectContentType(input) {
  if (!input) return 'text';
  
  const patterns = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    twitter: /(?:twitter\.com|x\.com)/i,
    tiktok: /tiktok\.com/i,
    image: /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i,
    url: /^https?:\/\//i,
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(input)) {
      return type;
    }
  }
  
  return 'text';
}

// Helper function to extract YouTube video ID
function extractYouTubeVideoId(url) {
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

// Helper function to fetch URL content
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = parse(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropagandaLens/2.0)'
      },
      timeout: 10000
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Limit response size to prevent memory issues
        if (data.length > 1024 * 1024) { // 1MB limit
          req.abort();
          reject(new Error('Response too large'));
        }
      });
      
      res.on('end', () => {
        resolve({ data, statusCode: res.statusCode, headers: res.headers });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Helper function to extract meta tags from HTML
function extractMetaTags(html) {
  const metaTags = {};
  
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
  
  // Extract standard meta tags
  const metaMatches = html.match(/<meta[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi);
  if (metaMatches) {
    metaMatches.forEach(match => {
      const nameMatch = match.match(/name=["']([^"']+)["']/);
      const contentMatch = match.match(/content=["']([^"']+)["']/);
      if (nameMatch && contentMatch) {
        metaTags[nameMatch[1]] = contentMatch[1];
      }
    });
  }
  
  return metaTags;
}

// Helper function to get best thumbnail from meta tags
function getBestThumbnail(metaTags, url) {
  // Priority order for thumbnail selection
  const thumbnailFields = [
    'og:image',
    'twitter:image',
    'twitter:image:src',
    'og:image:url',
    'image_src',
    'thumbnail'
  ];
  
  for (const field of thumbnailFields) {
    if (metaTags[field]) {
      let thumbnailUrl = metaTags[field];
      
      // Handle relative URLs
      if (thumbnailUrl.startsWith('//')) {
        thumbnailUrl = 'https:' + thumbnailUrl;
      } else if (thumbnailUrl.startsWith('/')) {
        const urlObj = new URL(url);
        thumbnailUrl = `${urlObj.protocol}//${urlObj.host}${thumbnailUrl}`;
      }
      
      console.log('✅ Found thumbnail:', thumbnailUrl, 'from', field);
      return thumbnailUrl;
    }
  }
  
  return null;
}

// Helper function to extract TikTok video ID
function extractTikTokVideoId(url) {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  return match ? match[1] : null;
}

// Helper function to extract Instagram post ID
function extractInstagramPostId(url) {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?]+)/);
  return match ? match[1] : null;
}

// Helper function to extract Twitter/X tweet ID
function extractTwitterId(url) {
  const match = url.match(/(?:twitter|x)\.com\/[^/]+\/status\/(\d+)/);
  return match ? match[1] : null;
}

// Helper function to extract content from URLs
async function extractContentFromUrl(url) {
  try {
    const contentType = detectContentType(url);
    console.log('🔍 Extracting content for type:', contentType, 'from URL:', url);
    
    const extractedData = {
      type: contentType,
      preview: '',
      contentLength: 0
    };
    
    if (contentType === 'youtube') {
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        extractedData.videoId = videoId;
        extractedData.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        extractedData.preview = `YouTube video (ID: ${videoId})`;
        extractedData.contentLength = extractedData.preview.length;
        console.log('✅ YouTube thumbnail extracted:', extractedData.thumbnail);
      }
    } else if (contentType === 'image') {
      extractedData.imageUrl = url;
      extractedData.thumbnail = url;
      extractedData.preview = 'Image content';
      extractedData.contentLength = extractedData.preview.length;
      console.log('✅ Image URL extracted:', url);
    } else if (contentType === 'twitter') {
      const tweetId = extractTwitterId(url);
      extractedData.tweetId = tweetId;
      
      try {
        const response = await fetchUrl(url);
        if (response.statusCode === 200) {
          const html = response.data;
          const metaTags = extractMetaTags(html);
          
          extractedData.thumbnail = getBestThumbnail(metaTags, url);
          extractedData.title = metaTags['og:title'] || metaTags['twitter:title'];
          extractedData.description = metaTags['og:description'] || metaTags['twitter:description'];
          
          // Extract text content
          let textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          extractedData.content = textContent;
          extractedData.preview = extractedData.description || textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
          extractedData.contentLength = textContent.length;
          
          console.log('✅ X/Twitter content extracted:', {
            tweetId,
            hasThumbnail: !!extractedData.thumbnail,
            title: extractedData.title
          });
        }
      } catch (fetchError) {
        console.log('⚠️ Failed to fetch X/Twitter content:', fetchError.message);
        extractedData.error = `Failed to fetch content: ${fetchError.message}`;
        extractedData.preview = url;
        extractedData.contentLength = url.length;
      }
    } else if (contentType === 'tiktok') {
      const videoId = extractTikTokVideoId(url);
      extractedData.videoId = videoId;
      
      try {
        const response = await fetchUrl(url);
        if (response.statusCode === 200) {
          const html = response.data;
          const metaTags = extractMetaTags(html);
          
          extractedData.thumbnail = getBestThumbnail(metaTags, url);
          extractedData.title = metaTags['og:title'];
          extractedData.description = metaTags['og:description'];
          
          // Extract text content
          let textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          extractedData.content = textContent;
          extractedData.preview = extractedData.description || textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
          extractedData.contentLength = textContent.length;
          
          console.log('✅ TikTok content extracted:', {
            videoId,
            hasThumbnail: !!extractedData.thumbnail,
            title: extractedData.title
          });
        }
      } catch (fetchError) {
        console.log('⚠️ Failed to fetch TikTok content:', fetchError.message);
        extractedData.error = `Failed to fetch content: ${fetchError.message}`;
        extractedData.preview = url;
        extractedData.contentLength = url.length;
      }
    } else if (contentType === 'url') {
      // Handle Instagram, Facebook, news sites, and other URLs
      try {
        const response = await fetchUrl(url);
        if (response.statusCode === 200) {
          const html = response.data;
          const metaTags = extractMetaTags(html);
          
          // Extract title from meta tags or title tag
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          extractedData.title = metaTags['og:title'] || metaTags['twitter:title'] || (titleMatch ? titleMatch[1].trim() : '');
          
          // Extract description
          extractedData.description = metaTags['og:description'] || metaTags['twitter:description'] || metaTags['description'];
          
          // Get the best thumbnail
          extractedData.thumbnail = getBestThumbnail(metaTags, url);
          
          // Special handling for Instagram
          if (url.includes('instagram.com')) {
            const postId = extractInstagramPostId(url);
            extractedData.postId = postId;
            extractedData.type = 'instagram';
            console.log('✅ Instagram post detected:', postId);
          }
          
          // Special handling for Facebook
          if (url.includes('facebook.com')) {
            extractedData.type = 'facebook';
            console.log('✅ Facebook post detected');
          }
          
          // Extract text content (basic text extraction)
          let textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
          extractedData.content = textContent;
          extractedData.preview = extractedData.description || textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
          extractedData.contentLength = textContent.length;
          
          console.log('✅ Webpage content extracted:', {
            title: extractedData.title,
            hasThumbnail: !!extractedData.thumbnail,
            contentLength: extractedData.contentLength,
            type: extractedData.type
          });
        }
      } catch (fetchError) {
        console.log('⚠️ Failed to fetch webpage content:', fetchError.message);
        extractedData.error = `Failed to fetch content: ${fetchError.message}`;
        extractedData.preview = url;
        extractedData.contentLength = url.length;
      }
    }
    
    return extractedData;
  } catch (error) {
    console.error('❌ Content extraction error:', error);
    return {
      type: 'url',
      error: error.message,
      preview: url,
      contentLength: url.length
    };
  }
}

// Helper function to check if content is a URL
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, contentType } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let sourceInfo = null;
    let actualAnalysisContent = content;

    // Extract content if it's a URL
    if (isValidUrl(content.trim())) {
      console.log('🌐 URL detected, extracting content and metadata...');
      const extractedContent = await extractContentFromUrl(content.trim());
      
      sourceInfo = {
        sourceUrl: content.trim(),
        contentType: extractedContent.type,
        extractedData: extractedContent
      };

      // Use extracted content for analysis if available
      if (extractedContent.content && extractedContent.content.trim()) {
        actualAnalysisContent = extractedContent.content;
        console.log('✅ Using extracted content for analysis:', actualAnalysisContent.length, 'characters');
      } else if (extractedContent.preview) {
        actualAnalysisContent = extractedContent.preview;
        console.log('✅ Using preview content for analysis:', actualAnalysisContent.length, 'characters');
      } else {
        // For images or when extraction fails, keep original URL for OpenAI to process
        actualAnalysisContent = content.trim();
        console.log('⚠️ Using original URL for analysis');
      }
    } else {
      sourceInfo = {
        contentType: contentType || 'text',
        originalContent: content.length > 200 ? content.substring(0, 200) + '...' : content
      };
    }

    // Create a more detailed prompt based on content type
    let contentDescription = '';
    if (sourceInfo && sourceInfo.extractedData) {
      if (sourceInfo.extractedData.type === 'youtube') {
        contentDescription = sourceInfo.extractedData.transcript ? 
          `YouTube video transcript from: ${sourceInfo.sourceUrl}` : 
          `YouTube video (transcript unavailable) from: ${sourceInfo.sourceUrl}`;
      } else if (sourceInfo.extractedData.type === 'webpage') {
        contentDescription = `Web article content from: ${sourceInfo.sourceUrl}`;
      } else if (sourceInfo.extractedData.type === 'image') {
        contentDescription = `Image from: ${sourceInfo.sourceUrl}`;
      } else {
        contentDescription = `Content from: ${sourceInfo.sourceUrl}`;
      }
    } else {
      contentDescription = contentType || 'text';
    }

    const prompt = `
Analyze the following ${contentDescription} for propaganda techniques and manipulation tactics.

Respond with ONLY a valid JSON object with this exact structure:
{
  "quickAssessment": "Brief 1-2 sentence assessment of manipulation level and main concerns",
  "manipulationScore": <number between 0-10 where 0=neutral, 10=highly manipulative>,
  "techniques": [
    {
      "name": "technique name",
      "description": "how this technique is used",
      "confidence": "high|medium|low",
      "example": "specific quote or example from content"
    }
  ],
  "counterPerspective": "Alternative viewpoint or what might be missing from this narrative",
  "reflectionQuestions": [
    "Critical thinking question 1",
    "Critical thinking question 2",
    "Critical thinking question 3"
  ]
}

CONTENT TO ANALYZE:
"""
${actualAnalysisContent}
"""

Remember: Respond with ONLY valid JSON, no other text. If you cannot access a URL or the content is insufficient, still provide a valid JSON response explaining the limitation.`;

    // Determine if we need to use vision model for images
    const isImageUrl = sourceInfo && sourceInfo.extractedData && sourceInfo.extractedData.type === 'image';
    
    let messages;
    let model = 'gpt-4o-mini';

    if (isImageUrl) {
      // Use vision model for image URLs
      model = 'gpt-4o-mini';
      messages = [
        {
          role: 'system',
          content: 'You are an expert in media literacy and propaganda analysis. You analyze visual content objectively and provide educational insights about manipulation techniques. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: sourceInfo.extractedData.imageUrl
              }
            }
          ]
        }
      ];
    } else {
      // For text and extracted content - analyze the provided content
      messages = [
        {
          role: 'system',
          content: 'You are an expert in media literacy and propaganda analysis. You analyze content objectively and provide educational insights about manipulation techniques. If given a URL that you cannot access, explain that you need the actual content to perform analysis. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
    }

    console.log('=== OPENAI REQUEST DEBUG ===');
    console.log('Model:', model);
    console.log('Messages:', JSON.stringify(messages, null, 2));
    console.log('=== END REQUEST DEBUG ===');

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1000
    });

    console.log('OpenAI API call completed successfully');

    const responseText = completion.choices[0].message.content.trim();
    
    console.log('=== OPENAI RESPONSE DEBUG ===');
    console.log('Raw response length:', responseText.length);
    console.log('Raw response:', responseText);
    console.log('=== END DEBUG ===');
    
    // Try to parse the JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
      console.log('JSON parsing successful');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError.message);
      console.error('Response text:', responseText);
      
      // Return error instead of fallback to help debug
      return res.status(500).json({
        error: 'OpenAI returned invalid JSON response',
        rawResponse: responseText.substring(0, 500),
        parseError: parseError.message
      });
    }

    // Validate the response structure
    const validatedResult = {
      quickAssessment: analysisResult.quickAssessment || "Analysis completed",
      manipulationScore: Math.max(0, Math.min(10, analysisResult.manipulationScore || 0)),
      techniques: Array.isArray(analysisResult.techniques) ? analysisResult.techniques : [],
      counterPerspective: analysisResult.counterPerspective || "Consider alternative viewpoints",
      reflectionQuestions: Array.isArray(analysisResult.reflectionQuestions) ? analysisResult.reflectionQuestions : []
    };

    // Add source information if we fetched content from a URL
    if (sourceInfo) {
      validatedResult.sourceInfo = sourceInfo;
    }

    res.status(200).json(validatedResult);

  } catch (error) {
    console.error('Analysis error:', error);
    
    res.status(500).json({
      error: 'Analysis failed',
      quickAssessment: "Technical error occurred during analysis",
      manipulationScore: 0,
      techniques: [],
      counterPerspective: "Unable to complete analysis due to technical issues",
      reflectionQuestions: [
        "Is this content from a reliable source?",
        "What verification can be done independently?",
        "Are there alternative sources to consult?"
      ]
    });
  }
};