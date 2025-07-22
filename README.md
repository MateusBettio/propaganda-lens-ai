# Propaganda Lens - Supabase Migration

## Architecture

```
Expo App (iOS/Android) → Supabase → Edge Functions → OpenAI + Jina Reader
```

### New Features:
- **Hybrid Content Extraction**: Jina Reader for articles/PDFs/images, YouTube API for videos
- **Content Caching**: Avoids re-extracting the same URLs
- **Database Storage**: All analyses stored in Supabase
- **Better Reliability**: More robust than Vercel approach

## Setup Instructions

### 1. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Get your project credentials from Settings > API:
   - `Project URL`
   - `anon/public key`

### 2. Database Setup

Run the migration to create the schema:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
-- in your Supabase SQL Editor
```

### 3. Environment Variables

#### Frontend (.env.local):
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (Supabase Edge Functions):
Set these in Supabase Dashboard > Settings > Edge Functions:
```
OPENAI_API_KEY=your_openai_api_key
JINA_API_KEY=your_jina_api_key (optional)
```

### 4. Deploy Edge Function

Install Supabase CLI and deploy:
```bash
npm install -g supabase
supabase login
supabase functions deploy analyze
```

### 5. Install Dependencies

Frontend:
```bash
cd propaganda-lens-v2
npm install
```

## How It Works

### Content Extraction Strategy:
- **YouTube Videos**: Extract transcripts using YouTube Transcript API
- **Articles/PDFs**: Use Jina Reader API for clean text extraction
- **Images**: Jina Reader with image captioning + OpenAI vision
- **Caching**: Extracted content cached to avoid re-processing

### Database Schema:
- `analyses`: Stores all analysis results with full metadata
- `content_cache`: Caches extracted content to improve performance

### API Flow:
1. User inputs URL in Expo app
2. App calls Supabase Edge Function
3. Function determines content type and extraction method
4. Content extracted via Jina Reader or YouTube API
5. OpenAI analyzes the extracted content
6. Results stored in database and returned to app

## Benefits Over Previous Architecture:

✅ **Better Content Extraction**: Jina Reader handles complex sites better than custom scraping
✅ **Caching**: Avoid re-extracting same URLs
✅ **Database Storage**: Analysis history and metadata
✅ **Scalability**: Supabase handles backend complexity
✅ **Reliability**: Better error handling and retry logic
✅ **Cost Efficiency**: Content caching reduces API calls

## Content Types Supported:

- **YouTube Videos**: Full transcript extraction
- **News Articles**: Clean article text (bypasses paywalls better than custom scraping)
- **PDFs**: Direct PDF text extraction
- **Images**: AI vision analysis with captions
- **Social Media**: Twitter, LinkedIn posts
- **Academic Papers**: Better formatting preservation

## Testing

Test with these URL types:
- YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
- News Article: `https://example.com/article`
- Image: `https://example.com/image.jpg`
- PDF: `https://example.com/document.pdf`