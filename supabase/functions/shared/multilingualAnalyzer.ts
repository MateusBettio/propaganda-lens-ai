// Multilingual content analysis system
export interface AnalysisResult {
  content: string;
  summary: string;
  indicators: Record<string, any>;
  confidence: number;
  sourceMetadata: Record<string, any>;
  language: string;
}

export interface LanguageDetectionResult {
  language: 'en' | 'pt-br' | 'es';
  confidence: number;
}

// Enhanced language detection with better Portuguese detection
export function detectLanguage(text: string): LanguageDetectionResult {
  const cleanText = text.toLowerCase();
  console.log('🔍 Language Detection Input:', cleanText.substring(0, 100) + '...');
  
  // Enhanced Portuguese indicators (more specific to PT-BR)
  const ptIndicators = [
    'não', 'são', 'foi', 'tem', 'mas', 'seu', 'ela', 'até', 'pela', 'isso', 
    'também', 'já', 'muito', 'governo', 'brasil', 'política', 'presidente', 
    'país', 'quando', 'então', 'onde', 'como', 'todos', 'fazer', 'bem',
    'anos', 'vez', 'ainda', 'depois', 'antes', 'hoje', 'aqui', 'agora',
    'estado', 'vida', 'tempo', 'casa', 'dia', 'ano', 'mês', 'pessoa',
    'trabalho', 'dinheiro', 'família', 'criança', 'mulher', 'homem'
  ];
  
  // Spanish indicators (distinct from Portuguese)
  const esIndicators = [
    'con', 'una', 'más', 'son', 'fue', 'sus', 'ella', 'hasta', 'esto',
    'también', 'muy', 'gobierno', 'españa', 'política', 'presidente',
    'país', 'así', 'donde', 'cuando', 'entonces', 'todo', 'hacer', 'bien',
    'años', 'vez', 'aún', 'después', 'antes', 'hoy', 'aquí', 'ahora',
    'estado', 'vida', 'tiempo', 'casa', 'día', 'año', 'mes', 'persona',
    'trabajo', 'dinero', 'familia', 'niño', 'mujer', 'hombre'
  ];
  
  // English indicators (distinct words)
  const enIndicators = [
    'the', 'that', 'with', 'for', 'are', 'was', 'his', 'she', 'until', 'this',
    'also', 'very', 'government', 'politics', 'president', 'country', 'where',
    'when', 'then', 'will', 'have', 'been', 'their', 'would', 'there',
    'could', 'should', 'people', 'time', 'year', 'way', 'day', 'man',
    'world', 'life', 'hand', 'part', 'child', 'right', 'back', 'work'
  ];
  
  // Count matches using word boundaries for better accuracy
  const ptScore = ptIndicators.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(cleanText);
  }).length;
  
  const esScore = esIndicators.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(cleanText);
  }).length;
  
  const enScore = enIndicators.filter(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(cleanText);
  }).length;
  
  console.log('🎯 Language Scores:', { pt: ptScore, es: esScore, en: enScore });
  
  const totalWords = cleanText.split(/\s+/).length;
  const maxScore = Math.max(ptScore, esScore, enScore);
  
  if (maxScore === 0 || totalWords < 5) {
    console.log('⚠️ No clear language detected, defaulting to English');
    return { language: 'en', confidence: 0.3 };
  }
  
  // Calculate confidence based on score ratio
  const confidence = Math.min((maxScore / Math.max(totalWords * 0.1, 1)) * 0.8 + 0.2, 0.95);
  
  let detectedLang: 'en' | 'pt-br' | 'es';
  if (ptScore === maxScore) {
    detectedLang = 'pt-br';
  } else if (esScore === maxScore) {
    detectedLang = 'es';
  } else {
    detectedLang = 'en';
  }
  
  console.log(`✅ Language Detected: ${detectedLang} (confidence: ${confidence.toFixed(2)})`);
  
  return { language: detectedLang, confidence };
}

// Language-specific propaganda analysis prompts
export const ANALYSIS_PROMPTS = {
  'en': {
    system: `You are an expert in propaganda analysis and media literacy. Analyze the provided content for propaganda techniques, misinformation, and manipulation tactics.

Provide analysis in English with the following structure:
- Summary: Brief overview of the content
- Propaganda Techniques: Identify specific techniques used
- Credibility Assessment: Evaluate source reliability and fact accuracy
- Emotional Manipulation: Identify emotional appeals and bias
- Recommendations: Provide guidance for critical evaluation

Be objective, factual, and educational in your analysis.`,
    
    user: (content: string) => `Analyze this content for propaganda techniques and misinformation:

Content: "${content}"

Provide a comprehensive analysis focusing on:
1. Propaganda techniques identified
2. Factual accuracy concerns
3. Emotional manipulation tactics
4. Source credibility assessment
5. Overall risk level (Low/Medium/High)

Respond in clear, educational English.`
  },
  
  'pt-br': {
    system: `Você é um especialista em análise de propaganda e alfabetização midiática. Analise o conteúdo fornecido quanto a técnicas de propaganda, desinformação e táticas de manipulação.

Forneça análise em português brasileiro com a seguinte estrutura:
- Resumo: Visão geral breve do conteúdo
- Técnicas de Propaganda: Identifique técnicas específicas utilizadas
- Avaliação de Credibilidade: Avalie confiabilidade da fonte e precisão factual
- Manipulação Emocional: Identifique apelos emocionais e viés
- Recomendações: Forneça orientação para avaliação crítica

Seja objetivo, factual e educativo em sua análise.`,

    user: (content: string) => `Analise este conteúdo quanto a técnicas de propaganda e desinformação:

Conteúdo: "${content}"

Forneça uma análise abrangente focando em:
1. Técnicas de propaganda identificadas
2. Preocupações com precisão factual
3. Táticas de manipulação emocional
4. Avaliação de credibilidade da fonte
5. Nível de risco geral (Baixo/Médio/Alto)

Responda em português brasileiro claro e educativo.`
  },
  
  'es': {
    system: `Eres un experto en análisis de propaganda y alfabetización mediática. Analiza el contenido proporcionado en busca de técnicas de propaganda, desinformación y táticas de manipulación.

Proporciona análisis en español con la siguiente estructura:
- Resumen: Visión general breve del contenido
- Técnicas de Propaganda: Identifica técnicas específicas utilizadas
- Evaluación de Credibilidad: Evalúa confiabilidad de la fuente y precisión factual
- Manipulación Emocional: Identifica apelaciones emocionales y sesgo
- Recomendaciones: Proporciona orientación para evaluación crítica

Sé objetivo, factual y educativo en tu análisis.`,

    user: (content: string) => `Analiza este contenido en busca de técnicas de propaganda y desinformación:

Contenido: "${content}"

Proporciona un análisis comprehensivo enfocándose en:
1. Técnicas de propaganda identificadas
2. Preocupaciones sobre precisión factual
3. Tácticas de manipulación emocional
4. Evaluación de credibilidad de la fuente
5. Nivel de riesgo general (Bajo/Medio/Alto)

Responde en español claro y educativo.`
  }
};

// Response templates for different languages
export const RESPONSE_TEMPLATES = {
  'en': {
    summary_prefix: "Analysis of content: ",
    confidence_high: "High confidence analysis",
    confidence_medium: "Medium confidence analysis", 
    confidence_low: "Low confidence analysis",
    thread_detected: "Multi-part thread detected",
    media_transcribed: "Media content transcribed",
    platform_label: "Platform",
    extraction_method: "Extraction method"
  },
  
  'pt-br': {
    summary_prefix: "Análise do conteúdo: ",
    confidence_high: "Análise de alta confiança",
    confidence_medium: "Análise de média confiança",
    confidence_low: "Análise de baixa confiança", 
    thread_detected: "Thread de múltiplas partes detectada",
    media_transcribed: "Conteúdo de mídia transcrito",
    platform_label: "Plataforma",
    extraction_method: "Método de extração"
  },
  
  'es': {
    summary_prefix: "Análisis del contenido: ",
    confidence_high: "Análisis de alta confianza",
    confidence_medium: "Análisis de confianza media",
    confidence_low: "Análisis de baja confianza",
    thread_detected: "Hilo de múltiples partes detectado", 
    media_transcribed: "Contenido multimedia transcrito",
    platform_label: "Plataforma",
    extraction_method: "Método de extracción"
  }
};

// Analyze content with language-specific approach
export async function analyzeContentMultilingual(
  content: string,
  sourceMetadata: Record<string, any> = {}
): Promise<AnalysisResult> {
  
  console.log('🚀 Starting multilingual analysis...');
  
  // Detect content language
  const langDetection = detectLanguage(content);
  const language = langDetection.language;
  
  console.log(`🌍 Analysis will be conducted in: ${language}`);
  
  // Get language-specific prompts and templates
  const prompts = ANALYSIS_PROMPTS[language];
  const templates = RESPONSE_TEMPLATES[language];
  
  if (!prompts) {
    console.error(`❌ No prompts found for language: ${language}`);
    throw new Error(`Unsupported language: ${language}`);
  }
  
  try {
    // Call OpenAI with language-specific prompts
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    console.log('📤 Sending request to OpenAI with language-specific prompts...');
    console.log('System prompt preview:', prompts.system.substring(0, 100) + '...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompts.system },
          { role: 'user', content: prompts.user(content) }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || 'Analysis unavailable';
    
    console.log('✅ OpenAI analysis received (preview):', analysis.substring(0, 100) + '...');
    
    // Calculate confidence based on content length and language detection
    const baseConfidence = Math.min(content.length / 100 * 0.1 + 0.5, 0.9);
    const languageBonus = langDetection.confidence > 0.8 ? 0.1 : 0;
    const confidence = Math.min(baseConfidence + languageBonus, 0.95);
    
    return {
      content,
      summary: analysis, // Use the full OpenAI analysis as the summary
      indicators: {
        language_detected: language,
        language_confidence: langDetection.confidence,
        content_length: content.length,
        analysis_language: language,
        has_thread: sourceMetadata.thread_length > 1,
        has_media: sourceMetadata.media_count > 0,
        openai_analysis_provided: true
      },
      confidence,
      sourceMetadata: {
        ...sourceMetadata,
        analysis_language: language,
        detected_language: language,
        language_confidence: langDetection.confidence,
        openai_model: 'gpt-4'
      },
      language
    };
    
  } catch (error) {
    console.error('❌ Multilingual analysis error:', error);
    
    // Fallback analysis with basic template
    const templates = RESPONSE_TEMPLATES[language];
    return {
      content,
      summary: `${templates.summary_prefix}${content.substring(0, 200)}...`,
      indicators: {
        language_detected: language,
        analysis_error: true,
        content_length: content.length,
        error_message: error.message
      },
      confidence: 0.3,
      sourceMetadata: {
        ...sourceMetadata,
        analysis_language: language,
        analysis_error: error.message
      },
      language
    };
  }
}