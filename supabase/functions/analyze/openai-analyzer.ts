import { AnalysisResult, ExtractedContent } from './types.ts';
import { detectLanguage } from './language-detection.ts';
import { validateContentQuality } from './content-validation.ts';

// Simplified OpenAI analysis
export async function analyzeWithOpenAI(content: string, sourceInfo?: ExtractedContent): Promise<AnalysisResult> {
  console.log('=== OPENAI ANALYSIS ===');
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  // Detect language first
  const languageDetection = detectLanguage(content);
  console.log('🌐 Language detected:', languageDetection.language, 'confidence:', languageDetection.confidence);
  
  // Validate content quality before proceeding with analysis
  const validation = validateContentQuality(content, sourceInfo?.embedUrl || '');
  if (!validation.isValid) {
    console.log('❌ Content validation failed:', validation.reason);
    throw new Error(`Content extraction incomplete: ${validation.reason} Please try a different post or check if the content is publicly accessible.`);
  }
  
  console.log('✅ Content validation passed');
  console.log('Content to analyze length:', content.length);
  console.log('Source info type:', sourceInfo?.type);
  console.log('=== CONTENT BEING ANALYZED ===');
  console.log('First 500 chars:', content.substring(0, 500));
  console.log('=== END CONTENT PREVIEW ===');

  // Handle debugging case where transcript extraction failed
  const isDebuggingCase = content === 'YouTube video - transcript not available' || content === 'TikTok video - transcript not available';
  
  const prompt = isDebuggingCase
    ? `This is a debugging scenario where video transcript extraction failed. 

Respond with ONLY valid JSON indicating this is a debugging case:
{
  "quickAssessment": "DEBUG: Video transcript extraction failed - check function logs for detailed error information",
  "techniques": [
    {
      "name": "Debugging Status",
      "description": "Video transcript extraction pipeline failed",
      "confidence": "high",
      "example": "Audio extraction or Whisper API integration needs investigation"
    }
  ],
  "counterPerspective": "This is a technical debugging case, not actual content analysis",
  "reflectionQuestions": [
    "Is the audio extraction service (Cobalt.tools) working?",
    "Is the OpenAI Whisper API accessible with current credentials?",
    "Are there file size or format limitations preventing transcription?"
  ]
}

DEBUG INFO: ${content}`
    : `Analyze this content for propaganda techniques and manipulation tactics.

LANGUAGE INSTRUCTIONS:
${languageDetection.language === 'pt-br' ? 'RESPONDA EM PORTUGUÊS BRASILEIRO. Analise o conteúdo e forneça todas as respostas em português brasileiro.' : 
  languageDetection.language === 'es' ? 'RESPONDA EN ESPAÑOL. Analiza el contenido y proporciona todas las respuestas en español.' : 
  'RESPOND IN ENGLISH. Analyze the content and provide all responses in English.'}

CRITICAL RULES:
1. Focus ONLY on the actual content/message being shared
2. DO NOT analyze the platform itself (Twitter/X, Instagram, TikTok, YouTube, etc.)
3. Ignore platform features, interfaces, or characteristics
4. Only analyze the substantive content, message, or narrative being presented by the post author
5. NEVER analyze error messages, system notifications, or technical failures

${sourceInfo?.type === 'twitter' ? `
MANDATORY TWEET TYPE CLASSIFICATION:
You MUST classify this tweet into ONE of these categories:
- HUMOR: Jokes, witty remarks, comedic observations${languageDetection.language === 'pt-br' ? ' (Piadas, observações humorísticas)' : ''}
- MEME: Image macros, viral content, pop culture references${languageDetection.language === 'pt-br' ? ' (Memes, conteúdo viral)' : ''}  
- SERIOUS: Factual statements, formal announcements, earnest discussions${languageDetection.language === 'pt-br' ? ' (Declarações factuais, discussões sérias)' : ''}
- NEWS: Breaking news, current events, journalistic content${languageDetection.language === 'pt-br' ? ' (Notícias, eventos atuais)' : ''}
- OPINION: Personal views, commentary, editorial statements${languageDetection.language === 'pt-br' ? ' (Opiniões pessoais, comentários)' : ''}
- UNKNOWN: Cannot be clearly categorized${languageDetection.language === 'pt-br' ? ' (Não pode ser claramente categorizado)' : ''}

CRITICAL: Your quickAssessment MUST start with exactly "[TYPE]" where TYPE is one of: HUMOR, MEME, SERIOUS, NEWS, OPINION, or UNKNOWN.
${languageDetection.language === 'pt-br' ? 
  'Exemplo: "[HUMOR] Este tweet usa humor para..." ou "[SERIOUS] Este tweet apresenta..."' : 
  'Example format: "[HUMOR] This tweet uses humor to..."'}
` : ''}

Respond with ONLY valid JSON:
{
  "quickAssessment": "${sourceInfo?.type === 'twitter' ? '[TYPE] Your actual assessment here...' : 'Brief assessment focusing on manipulative characteristics'}",
  "techniques": [
    {
      "name": "Example Technique",
      "description": "How it's used",
      "confidence": "medium",
      "example": "Quote from content"
    }
  ],
  "counterPerspective": "Alternative viewpoint",
  "reflectionQuestions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ]
}

CONTENT: "${content.substring(0, 1000)}"`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a media literacy expert. You MUST respond with ONLY valid JSON. No additional text, explanations, or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(15000) // 15 second timeout for faster response
    });

    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content.trim();
    
    console.log('OpenAI response length:', responseText.length);
    console.log('OpenAI raw response:', responseText.substring(0, 200) + '...');
    
    try {
      // Clean the response text to handle common JSON formatting issues
      let cleanedResponse = responseText.trim();
      
      // Remove any markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\s*/g, '').replace(/```\s*$/g, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      console.log('JSON parsing successful');
      console.log('Parsed quickAssessment:', parsed.quickAssessment?.substring(0, 100) + '...');
      
      // Add language detection results to the response
      return {
        ...parsed,
        language: languageDetection.language,
        languageConfidence: languageDetection.confidence
      };
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw response:', responseText.substring(0, 500));
      
      // Fallback: Return a structured error response instead of throwing
      console.log('Returning fallback response due to JSON parsing failure');
      return {
        quickAssessment: "Analysis temporarily unavailable due to formatting error",
        techniques: [{
          name: "Processing Error",
          description: "The analysis system encountered a formatting issue. Please try again.",
          confidence: "low",
          example: "System is working to resolve response formatting"
        }],
        counterPerspective: "This is a temporary technical issue, not a content analysis",
        reflectionQuestions: [
          "Should I try submitting this content again?",
          "Is the content publicly accessible?",
          "Could there be temporary service issues?"
        ],
        language: languageDetection.language,
        languageConfidence: languageDetection.confidence
      };
    }
  } catch (error) {
    console.error('OpenAI request failed:', error);
    throw error;
  }
}