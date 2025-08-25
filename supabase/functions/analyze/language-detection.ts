import { LanguageDetection } from './types.ts';

export function detectLanguage(text: string): LanguageDetection {
  const portuguese = [
    'que', 'não', 'uma', 'para', 'com', 'como', 'mais', 'isso', 'ser', 'tem', 'ele', 'ela', 'seu', 'sua',
    'muito', 'mas', 'vai', 'aqui', 'ainda', 'só', 'mesmo', 'porque', 'quando', 'onde', 'então', 'já',
    'Brasil', 'português', 'governo', 'presidente', 'política', 'economia'
  ];
  
  const spanish = [
    'que', 'no', 'una', 'para', 'con', 'como', 'más', 'esto', 'ser', 'tiene', 'él', 'ella', 'su',
    'muy', 'pero', 'va', 'aquí', 'aún', 'sólo', 'mismo', 'porque', 'cuando', 'donde', 'entonces', 'ya'
  ];
  
  const lowerText = text.toLowerCase();
  let ptScore = 0;
  let esScore = 0;
  let enScore = 0;
  
  portuguese.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = (lowerText.match(regex) || []).length;
    ptScore += matches;
  });
  
  spanish.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = (lowerText.match(regex) || []).length;
    esScore += matches;
  });
  
  const englishWords = ['the', 'and', 'that', 'for', 'with', 'you', 'this', 'but', 'not', 'are', 'have', 'from', 'they', 'we', 'been', 'to'];
  englishWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = (lowerText.match(regex) || []).length;
    enScore += matches;
  });
  
  const totalWords = text.split(/\s+/).length;
  const maxScore = Math.max(ptScore, esScore, enScore);
  
  if (maxScore === 0) {
    return { language: 'en', confidence: 0.3 };
  }
  
  const confidence = Math.min(maxScore / totalWords, 1.0);
  
  if (ptScore === maxScore) {
    return { language: 'pt-br', confidence };
  } else if (esScore === maxScore) {
    return { language: 'es', confidence };
  } else {
    return { language: 'en', confidence };
  }
}