<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Lumenalta Feedback Practice App

Professional feedback practice simulator with multi-provider AI support (Gemini, Anthropic, OpenAI).

View your app in AI Studio: https://ai.studio/apps/drive/15JWpMJnKYBcQmaLxEhsR-Xln2HdJqIKR

## Architecture

**Client-Side (React + Vite):** Feedback UI, scenario selection, chat interface, evaluation report display.

**Server-Side (Vercel Serverless):** AI provider integrations with server-side API keys for security.

```
Client (browser) → Fetch('/api/chat', '/api/evaluate', '/api/scenario') → Vercel Functions → AI APIs
```

## Run Locally

**Prerequisites:** Node.js 18+

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set API keys in `.env.local`:**
   ```
   GEMINI_API_KEY=your_gemini_key
   ANTHROPIC_API_KEY=your_anthropic_key
   OPENAI_API_KEY=your_openai_key
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```
   App runs on `http://localhost:3000` with Vercel serverless functions mocked locally.

## Deploy to Vercel

### Prerequisites
- Vercel account (free tier available at https://vercel.com)
- GitHub repository with this code

### Setup Steps

1. **Connect repository to Vercel:**
   - Visit [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Select your GitHub repository

2. **Set environment variables in Vercel:**
   - In project settings, go to "Environment Variables"
   - Add the following secrets:
     - `GEMINI_API_KEY`: Your Google Gemini API key
     - `ANTHROPIC_API_KEY`: Your Anthropic API key
     - `OPENAI_API_KEY`: Your OpenAI API key

3. **Deploy:**
   - Vercel automatically deploys on `git push` to main branch
   - Serverless functions in `/api` are automatically deployed
   - Frontend (React) is built and served as static assets

### Required Environment Variables

| Variable | Source | Notes |
|----------|--------|-------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) | Required for Gemini provider |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com) | Required for Anthropic provider |
| `OPENAI_API_KEY` | [OpenAI API Keys](https://platform.openai.com/api-keys) | Required for OpenAI provider |

### Vercel Build Configuration

The `vercel.json` file is pre-configured:
- **Build command:** `npm run build` (Vite builds to `dist/`)
- **Output directory:** `dist/`
- **API functions:** Auto-routed from `/api` directory

## API Endpoints

All endpoints require `POST` with JSON body:

### `/api/chat`
**Request:**
```json
{
  "provider": "Gemini" | "Anthropic" | "OpenAI",
  "scenario": { /* Scenario object */ },
  "messages": [{ "role": "user" | "model", "text": "..." }]
}
```
**Response:**
```json
{ "message": "AI response text" }
```

### `/api/evaluate`
**Request:**
```json
{
  "provider": "Gemini" | "Anthropic" | "OpenAI",
  "scenario": { "title": "...", "context": "...", "assertions": [...] },
  "transcript": [{ "role": "user" | "model", "text": "..." }]
}
```
**Response:** `EvaluationReport` with scores and recommendations

### `/api/scenario`
**Request:**
```json
{
  "provider": "Gemini" | "Anthropic" | "OpenAI",
  "description": "User's custom scenario description"
}
```
**Response:** Generated `Scenario` object

## Development

- **Edit frontend:** Modify files in root directory (`App.tsx`, `components/`, `services/`)
- **Edit API functions:** Modify files in `/api` directory
- **Local testing:** `npm run dev` includes serverless function mocking via Vite

## Notes

- API keys are **never exposed in the client bundle** (moved to serverless functions)
- Chat history is maintained client-side (stateless serverless architecture)
- Transcripts limited to 50 messages to manage payload size
- Cold starts (~1-2s) acceptable for internal practice tool
