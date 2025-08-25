export interface AnalysisRequest {
  content: string;
  contentType?: string;
}

export interface ExtractedContent {
  type: 'youtube' | 'webpage' | 'image' | 'text' | 'twitter' | 'instagram' | 'facebook' | 'tiktok';
  content?: string;
  transcript?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  imageUrl?: string;
  videoId?: string;
  postId?: string;
  tweetId?: string;
  preview: string;
  contentLength: number;
  extractionMethod: 'jina' | 'youtube' | 'meta-tags' | 'custom' | 'assemblyai-universal' | 'audio-whisper' | 'youtube-no-transcript' | 'tiktok-no-transcript' | 'instagram-no-transcript';
  error?: string;
  embedUrl?: string;
  embedHtml?: string;
  tweetType?: 'humor' | 'meme' | 'serious' | 'news' | 'opinion' | 'unknown';
}

export interface AnalysisResult {
  quickAssessment: string;
  techniques: Array<{
    name: string;
    description: string;
    confidence: 'low' | 'medium' | 'high';
    example: string;
  }>;
  counterPerspective: string;
  reflectionQuestions: string[];
  language?: string;
  languageConfidence?: number;
}

export interface ExtractionFlowDescription {
  summary: string;
  steps: string[];
  contentInfo: {
    source: string;
    extractionMethod?: string;
    contentLength: number;
    hasTranscript?: boolean;
    thumbnailFound?: boolean;
  };
}

export interface ContentValidation {
  isValid: boolean;
  reason?: string;
}

export interface LanguageDetection {
  language: string;
  confidence: number;
}