import nock from 'nock';

// Mock the external dependencies before importing
const mockTwitterApi = {
  v2: {
    singleTweet: jest.fn(),
    search: jest.fn(),
  },
};

const mockAssemblyAI = {
  transcripts: {
    create: jest.fn(),
    get: jest.fn(),
  },
};

jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn(() => mockTwitterApi),
}));

jest.mock('assemblyai', () => ({
  AssemblyAI: jest.fn(() => mockAssemblyAI),
}));

jest.mock('p-limit', () => jest.fn(() => (fn: Function) => fn()));

// Import after mocking
import { fetchFromX } from '../../src/extractors/xFetcher';

describe('fetchFromX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should extract tweet content successfully', async () => {
    const testUrl = 'https://x.com/user/status/1234567890';
    
    // Mock Twitter API response
    const mockTweetData = {
      data: {
        id: '1234567890',
        text: 'This is a test tweet',
        author_id: 'user123',
        conversation_id: '1234567890',
        created_at: '2024-01-01T10:00:00.000Z',
        lang: 'en',
      },
      includes: {
        media: [],
      },
    };

    mockTwitterApi.v2.singleTweet.mockResolvedValue(mockTweetData);
    mockTwitterApi.v2.search.mockResolvedValue({ data: { data: [] } });

    const result = await fetchFromX(testUrl);

    expect(result).toEqual({
      text: 'This is a test tweet',
      html: `<blockquote class="twitter-tweet"><a href="${testUrl}"></a></blockquote>`,
      meta: {
        thread: [mockTweetData.data],
        media: [],
      },
    });

    expect(mockTwitterApi.v2.singleTweet).toHaveBeenCalledWith('1234567890', {
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
    });
  });

  it('should handle tweet threads', async () => {
    const testUrl = 'https://x.com/user/status/1234567890';
    
    const mainTweet = {
      id: '1234567890',
      text: 'This is the first tweet in a thread',
      author_id: 'user123',
      conversation_id: '1234567890',
      created_at: '2024-01-01T10:00:00.000Z',
      lang: 'en',
    };

    const threadTweet = {
      id: '1234567891',
      text: 'This is the second tweet in the thread',
      author_id: 'user123',
      conversation_id: '1234567890',
      created_at: '2024-01-01T10:01:00.000Z',
      lang: 'en',
    };

    mockTwitterApi.v2.singleTweet.mockResolvedValue({
      data: mainTweet,
      includes: { media: [] },
    });

    mockTwitterApi.v2.search.mockResolvedValue({
      data: { data: [threadTweet] },
    });

    const result = await fetchFromX(testUrl);

    expect(result.text).toBe(
      'This is the first tweet in a thread\n\nThis is the second tweet in the thread'
    );
    expect(result.meta.thread).toHaveLength(2);
  });

  it('should handle video transcription', async () => {
    const testUrl = 'https://x.com/user/status/1234567890';
    
    const mockTweetData = {
      data: {
        id: '1234567890',
        text: 'Check out this video!',
        author_id: 'user123',
        conversation_id: '1234567890',
        created_at: '2024-01-01T10:00:00.000Z',
        lang: 'en',
      },
      includes: {
        media: [
          {
            type: 'video',
            variants: [
              {
                content_type: 'video/mp4',
                url: 'https://example.com/video.mp4',
              },
            ],
          },
        ],
      },
    };

    mockTwitterApi.v2.singleTweet.mockResolvedValue(mockTweetData);
    mockTwitterApi.v2.search.mockResolvedValue({ data: { data: [] } });

    // Mock AssemblyAI responses
    mockAssemblyAI.transcripts.create.mockResolvedValue({ id: 'transcript-123' });
    mockAssemblyAI.transcripts.get
      .mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'completed', text: 'This is the video transcript' });

    const result = await fetchFromX(testUrl);

    expect(result.text).toBe('Check out this video!\n\n---\n\nThis is the video transcript');
    expect(mockAssemblyAI.transcripts.create).toHaveBeenCalledWith({
      audio_url: 'https://example.com/video.mp4',
      summarization: false,
      entity_detection: false,
    });
  });

  it('should throw error for invalid URL', async () => {
    const invalidUrl = 'https://x.com/user/status/';
    
    await expect(fetchFromX(invalidUrl)).rejects.toThrow('Invalid tweet URL');
  });

  it('should have combined text length > 0 for valid tweet', async () => {
    const testUrl = 'https://x.com/user/status/1234567890';
    
    mockTwitterApi.v2.singleTweet.mockResolvedValue({
      data: {
        id: '1234567890',
        text: 'Valid tweet content',
        author_id: 'user123',
        conversation_id: '1234567890',
        created_at: '2024-01-01T10:00:00.000Z',
        lang: 'en',
      },
      includes: { media: [] },
    });
    
    mockTwitterApi.v2.search.mockResolvedValue({ data: { data: [] } });

    const result = await fetchFromX(testUrl);

    expect(result.text.length).toBeGreaterThan(0);
    expect(result.meta).toHaveProperty('thread');
    expect(result.meta).toHaveProperty('media');
    expect(Array.isArray(result.meta.thread)).toBe(true);
    expect(Array.isArray(result.meta.media)).toBe(true);
  });
});