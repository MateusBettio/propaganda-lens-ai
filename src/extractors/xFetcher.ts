import { TwitterApi, TweetV2SingleResult } from 'twitter-api-v2';
import pLimit from 'p-limit';
import { AssemblyAI } from 'assemblyai';
import { NormalisedContent } from '../types';

const twitter = new TwitterApi(process.env.X_BEARER_TOKEN!);
const aai = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });
const limit = pLimit(15); // 450 req / 15 min cap

export async function fetchFromX(rawUrl: string): Promise<NormalisedContent> {
  const id = rawUrl.split('/').pop()?.split('?')[0];
  if (!id) throw new Error('Invalid tweet URL');

  // 1) Pull tweet (+thread) text & media
  const { data, includes } = (await limit(() =>
    twitter.v2.singleTweet(id, {
      expansions: [
        'author_id',
        'attachments.media_keys',
        'referenced_tweets.id',
        'referenced_tweets.id.author_id',
      ],
      'media.fields': [
        'type',
        'url',
        'preview_image_url',
        'duration_ms',
        'variants',
        'public_metrics',
      ],
      'tweet.fields': [
        'text',
        'lang',
        'created_at',
        'conversation_id',
        'referenced_tweets',
      ],
    })
  )) as TweetV2SingleResult;

  // Reconstruct thread (same conversation_id, chronological)
  const thread: any[] = [data];
  if (data.conversation_id === data.id) {
    const r = await limit(() =>
      twitter.v2.search(`conversation_id:${data.id} from:${data.author_id}`, {
        'tweet.fields': ['text', 'created_at', 'lang'],
      })
    );
    r.data?.data?.forEach((t) => thread.push(t));
    thread.sort((a, b) => Date.parse(a.created_at!) - Date.parse(b.created_at!));
  }

  // 2) Collate visible text
  const text = thread.map((t) => t.text).join('\n\n');

  // 3) Handle media – run AssemblyAI on any video/audio URLs without caption tracks
  const mediaText: string[] = [];
  const media = includes?.media ?? [];
  for (const m of media) {
    if (['video', 'animated_gif'].includes(m.type)) {
      const mp4Variant = (m as any).variants?.find((v: any) => v.content_type?.includes('mp4'));
      if (mp4Variant?.url) {
        const transcript = await aai.transcripts.create({
          audio_url: mp4Variant.url,
          summarization: false,
          entity_detection: false,
        });
        
        // Poll for completion instead of waitForProcessing
        let result = await aai.transcripts.get(transcript.id);
        while (result.status === 'processing' || result.status === 'queued') {
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await aai.transcripts.get(transcript.id);
        }
        
        if (result.status === 'completed') {
          mediaText.push(result.text ?? '');
        }
      }
    }
  }

  return {
    text: [text, ...mediaText].filter(Boolean).join('\n\n---\n\n'),
    html: `<blockquote class="twitter-tweet"><a href="${rawUrl}"></a></blockquote>`,
    meta: { thread, media },
  };
}