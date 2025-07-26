export interface NormalisedContent {
  text: string;
  html: string;
  meta: {
    thread?: any[];
    media?: any[];
    [key: string]: any;
  };
  needsTranscription?: boolean;
}