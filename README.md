# Propaganda Lens AI - Twitter/X Handler Implementation

## New Architecture Overview

This project has been migrated to a **Supabase-first serverless architecture** with a new Twitter/X handler implementing the modern extraction pipeline.

```
URL Input → Content Type Detection → Platform-Specific Extraction → Content Analysis → Results
```

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Supabase CLI
- Required API keys (see Environment Variables section)

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
X_BEARER_TOKEN=your_twitter_bearer_token
JINA_API_KEY=your_jina_api_key_optional
```

### 4. Database Setup

Run migrations to create the database schema:

```bash
supabase start
supabase db reset
```

This creates:
- `extraction_jobs` table - Queue for URL processing
- `analysis` table - Historical analysis results

### 5. Deploy Edge Functions

```bash
supabase functions deploy extract
supabase functions deploy worker
supabase functions deploy analyze
```

### 6. Test the Implementation

```bash
npm test
```

## Twitter/X Handler Features

The new **Twitter/X handler** (`src/extractors/xFetcher.ts`) implements:

### ✅ Complete Implementation
- **Thread Reconstruction**: Automatically fetches full tweet threads using conversation_id
- **Media Transcription**: Videos/GIFs transcribed via AssemblyAI
- **Rate Limiting**: Built-in p-limit with 450 requests/15min compliance
- **Robust Error Handling**: Comprehensive error handling with fallbacks

### API Integration
- **Twitter API v2**: Full access to tweets, threads, and media metadata
- **AssemblyAI**: Universal video transcription (MP4 variants)
- **Supabase Queue**: Job-based processing with status tracking

### Usage Example

```typescript
import { fetchFromX } from './src/extractors/xFetcher';

const result = await fetchFromX('https://x.com/user/status/1234567890');
// Returns: { text, html, meta: { thread, media } }
```

## API Endpoints

### POST /extract
Creates extraction job for a URL:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://x.com/user/status/1234567890"}'
```

### POST /worker  
Processes pending extraction jobs (typically called via cron):
```bash
curl -X POST https://your-project.supabase.co/functions/v1/worker
```

## Testing

Run the test suite:
```bash
npm test    # Run all tests
npm run lint # Check code style
```

Tests cover:
- ✅ Basic tweet extraction
- ✅ Thread reconstruction  
- ✅ Video transcription with AssemblyAI
- ✅ Error handling for invalid URLs
- ✅ Combined text length validation

## Rate Limits & Credits

- **Twitter API**: 450 requests/15 minutes (handled by p-limit)
- **AssemblyAI**: Based on your plan (pay-per-use)
- **Jina Reader**: 10,000 requests/month free tier

## Architecture Benefits

**vs Old Vercel/Whisper:**
- ✅ **Serverless-First**: Edge Functions vs heavy compute
- ✅ **Universal Transcription**: AssemblyAI vs self-hosted Whisper  
- ✅ **API-Based**: Reliable external services vs fragile scraping
- ✅ **Queue System**: Job processing vs synchronous timeouts
- ✅ **Type Safety**: Full TypeScript vs mixed JS/Python

## Next Steps

1. **Complete YouTube Handler**: Migrate from current analyze function
2. **Add TikTok Handler**: Direct AssemblyAI integration
3. **Generic Web Handler**: Jina Reader + fallbacks
4. **Propaganda Analysis**: Integrate ML pipeline

See `docs/architecture.md` for detailed architecture documentation.