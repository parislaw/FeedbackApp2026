# Deployment Guide

## Overview

This guide covers deploying the Lumenalta feedback app to Vercel's serverless platform. The deployment process is automated and includes both the React frontend and serverless API functions.

## Prerequisites

### Required Accounts

1. **GitHub Account:** Repository must be on GitHub
2. **Vercel Account:** Free tier available at https://vercel.com
3. **AI Provider Accounts:**
   - Google AI Studio (Gemini) - Free tier available
   - Anthropic Console (Claude) - Requires API key
   - OpenAI Platform (GPT-4) - Requires API key

### API Keys

Obtain API keys from each provider before deploying:

| Provider | Link | Key Format |
|----------|------|-----------|
| Gemini | https://aistudio.google.com/app/apikey | 39-character alphanumeric |
| Anthropic | https://console.anthropic.com/account/keys | Starts with `sk-ant-` |
| OpenAI | https://platform.openai.com/account/api-keys | Starts with `sk-` |

## Local Development Setup

### Installation

```bash
# Clone repository (if not already done)
git clone https://github.com/your-username/lumenalta-feedback-app.git
cd lumenalta-feedback-app

# Install dependencies
npm install
```

### Environment Variables

Create `.env.local` in project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

### Run Locally

```bash
npm run dev
```

Access at `http://localhost:5173` (or port shown in terminal).

**Serverless functions** automatically available at `http://localhost:3000/api/*`

### Testing Serverless Functions Locally

**Test chat endpoint:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "scenario": {
      "persona": {
        "name": "Test Manager",
        "roleDescription": "Senior manager",
        "difficulty": "medium",
        "characteristics": ["direct", "supportive"]
      },
      "assertions": ["Acknowledges concerns"]
    },
    "messages": [{"role": "user", "text": "Hello"}]
  }'
```

Expected response:
```json
{
  "message": "AI-generated response here"
}
```

**Test evaluate endpoint:**
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "Anthropic",
    "scenario": {
      "title": "Test",
      "context": "Test context",
      "assertions": ["Test assertion"]
    },
    "transcript": [
      {"role": "user", "text": "Hello"},
      {"role": "assistant", "text": "Hi there"}
    ]
  }'
```

Expected response:
```json
{
  "summary": {"overallScore": 75, ...},
  "feedbackItems": [...],
  "recommendations": [...]
}
```

## Vercel Deployment

### Step 1: Push to GitHub

Ensure code is committed and pushed:

```bash
git add .
git commit -m "Initial commit: Vercel serverless setup"
git push origin main
```

**Important:** Never commit API keys. Ensure `.env.local` is in `.gitignore`:

```bash
# Verify .env.local is ignored
git status
# Should NOT show .env.local in untracked files
```

### Step 2: Connect Vercel to GitHub

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select your GitHub repository
4. Click **"Import"**

### Step 3: Configure Environment Variables

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add variables:
   - **Name:** `GEMINI_API_KEY` → **Value:** Your Gemini API key
   - **Name:** `ANTHROPIC_API_KEY` → **Value:** Your Anthropic API key
   - **Name:** `OPENAI_API_KEY` → **Value:** Your OpenAI API key
3. Click **"Save"**

**Important Security Notes:**
- Variables are encrypted at rest
- Only available to serverless functions (not frontend)
- Frontend cannot access these variables
- Use `process.env.VARIABLE_NAME` only in `/api` functions

### Step 4: Deploy

Vercel automatically deploys when you push to GitHub:

```bash
# Make a change to trigger deployment
echo "# Updated" >> README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

Or manually redeploy:
1. Vercel Dashboard → Your Project
2. Click **"Redeploy"** button

**Deployment takes 2-3 minutes:**
- Install dependencies
- Build frontend (Vite)
- Compile serverless functions
- Deploy globally to CDN

### Step 5: Verify Deployment

1. Get deployment URL from Vercel dashboard
2. Test chat endpoint:
```bash
curl -X POST https://your-deployment-url.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"Anthropic","scenario":{...},"messages":[...]}'
```

3. Open app in browser at deployment URL
4. Try a practice scenario to verify end-to-end

## Build Configuration

### vercel.json

Pre-configured for this project:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "outputDirectory": "dist"
}
```

**Explanation:**
- `buildCommand`: Runs `vite build` (builds React frontend)
- `devCommand`: Runs `vite` (local development server)
- `outputDirectory`: Where build output goes (served as static assets)

Vercel automatically detects `/api` directory and deploys serverless functions.

### Build Process

Vercel executes in order:
1. `npm install` - Install dependencies
2. `npm run build` - Build frontend to `dist/`
3. Detect `/api` directory functions
4. Compile TypeScript in `/api` functions
5. Deploy assets to CDN
6. Deploy functions globally

## Environment Variables Reference

### Required for Chat/Evaluate/Scenario

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `GEMINI_API_KEY` | If using Gemini | `AIzaSy...` | 39 chars |
| `ANTHROPIC_API_KEY` | If using Anthropic | `sk-ant-...` | Secure string |
| `OPENAI_API_KEY` | If using OpenAI | `sk-...` | Secure string |

### Recommended Production Variables

| Variable | Purpose |
|----------|---------|
| `LOG_LEVEL` | `debug` \| `info` \| `error` |
| `ENABLE_ANALYTICS` | `true` \| `false` |

### Not Used (But Available)

```bash
# Never use these (frontend cannot access them)
VITE_GEMINI_API_KEY    # ❌ Wrong
VITE_ANTHROPIC_API_KEY # ❌ Wrong

# Only backend functions access server-side keys
GEMINI_API_KEY         # ✅ Correct
ANTHROPIC_API_KEY      # ✅ Correct
```

## Monitoring & Debugging

### Vercel Dashboard Logs

View real-time function logs:
1. Vercel Dashboard → Your Project
2. **"Deployments"** tab
3. Select latest deployment
4. Click **"Functions"**
5. Select `/api/chat` (or other function)
6. View live logs

### Common Deployment Issues

#### Build Fails: "npm run build" Error

**Problem:** Vite build fails

**Solution:**
```bash
# Test build locally
npm run build

# Check for TypeScript errors
# Fix any compilation errors
# Re-push to GitHub
```

#### Functions Not Found (404 on /api/*)

**Problem:** Serverless functions not deployed

**Solution:**
```bash
# Verify /api directory structure
ls -la api/
# Should show: chat.ts, evaluate.ts, scenario.ts, _lib/

# Verify TypeScript compilation
npm run build
# Should compile without errors

# Redeploy
# Vercel Dashboard → Redeploy
```

#### Authentication Errors at Runtime

**Problem:** "Authentication failed" errors in app

**Symptoms:**
- Chat returns "Authentication failed"
- Works locally but fails on Vercel

**Solution:**
1. Verify env variables in Vercel:
   - Dashboard → Settings → Environment Variables
   - Confirm all three keys present
2. Verify keys are valid:
   - Test keys locally in `.env.local`
   - Try a simple API call with cURL
3. Check provider account status:
   - Gemini: Verify API enabled in Google Cloud
   - Anthropic: Check account has credit
   - OpenAI: Check account has credit and isn't rate-limited

#### Cold Start Latency

**Problem:** First request takes 2-5 seconds

**This is normal behavior for serverless:**
- First invocation needs to start function
- Subsequent requests within 15 min are warm
- Cannot be eliminated (architectural constraint)

**Mitigation:**
- Keep function code small
- Initialize clients only once
- Cache computed values where possible

#### High Function Duration

**Problem:** Chat/evaluate requests timeout (>60s)

**Causes:**
- Large chat history (50+ messages)
- Provider rate limiting
- Network issues

**Solutions:**
```typescript
// Trim chat history to most recent 20 messages
if (messages.length > 20) {
  messages = messages.slice(-20);
}
```

## Testing in Production

### Manual Testing

1. **Chat endpoint:**
   - Select practice scenario
   - Send message
   - Verify response in under 5 seconds

2. **Evaluate endpoint:**
   - Complete practice conversation
   - Click "Evaluate"
   - Verify report generates in under 10 seconds

3. **Scenario endpoint:**
   - Click "Custom Scenario"
   - Enter description
   - Verify scenario generates in under 5 seconds

### Load Testing

**Small load test (using Apache Bench):**

```bash
# Install Apache Bench (macOS)
brew install httpd

# Simple load test (1 concurrent request, 10 total)
ab -n 10 -c 1 https://your-deployment.vercel.app/

# More realistic (5 concurrent, 50 total)
ab -n 50 -c 5 https://your-deployment.vercel.app/

# With POST data
ab -n 10 -c 1 -p payload.json \
  -T "application/json" \
  https://your-deployment.vercel.app/api/chat
```

### Monitoring Function Invocations

**Via Vercel Dashboard:**
1. Project → **"Functions"** tab
2. View:
   - Invocation count
   - Duration percentiles
   - Error rate
   - Cold start count

## Troubleshooting Guide

### Deployment Won't Start

**Symptoms:** Push to GitHub but Vercel doesn't deploy

**Steps:**
1. Check GitHub webhooks:
   - GitHub Repo → Settings → Webhooks
   - Verify `vercel.com` webhook present
2. Check Vercel project settings:
   - Dashboard → Settings → Git
   - Verify GitHub repo connected
3. Manual trigger:
   - Dashboard → Redeploy button

### Frontend Loads But API Returns 404

**Symptoms:** UI works but chat/evaluate fail with 404

**Solution:**
```bash
# Verify function files exist
ls api/chat.ts api/evaluate.ts api/scenario.ts

# Check for TypeScript errors
npm run build

# Verify they're committed
git status

# Push and redeploy
git push origin main
```

### App Loads Blank/White Screen

**Symptoms:** Deployment URL loads but shows blank page

**Debugging:**
1. Check browser console for errors:
   - Open DevTools (F12)
   - Check Console tab
   - Look for JavaScript errors
2. Check deployment log:
   - Vercel Dashboard → select deployment
   - Check Build log section
   - Look for vite build errors
3. Test API separately:
   ```bash
   curl https://your-deployment.vercel.app/api/chat
   # Should return 405 (POST required)
   ```

### Specific Provider Failures

**Gemini "Authentication failed":**
- Verify API enabled: https://console.cloud.google.com/apis
- Check key hasn't expired
- Verify quotas in Google Cloud

**Anthropic "Authentication failed":**
- Verify key format (starts with `sk-ant-`)
- Check account has credit or free trial access
- Verify key hasn't been rotated

**OpenAI "Authentication failed":**
- Verify key format (starts with `sk-`)
- Check account has credits
- Verify organization access (if org key)

## Rollback Procedures

### Rollback to Previous Deployment

**Via Vercel Dashboard:**
1. Dashboard → Deployments
2. Find previous working deployment
3. Click → "Promote to Production"

**Via Git:**
```bash
# Find previous working commit
git log --oneline

# Revert to that commit
git revert <commit-hash>
git push origin main

# Vercel automatically redeploys
```

## Performance Optimization

### Reduce Cold Starts

1. **Keep dependencies minimal:**
   - Only include necessary packages in `package.json`
   - Verify unused dependencies removed

2. **Optimize function size:**
   - Each function should be <10MB uncompressed
   - Check bundle size:
   ```bash
   npm run build
   du -sh dist/
   ```

3. **Lazy load expensive operations:**
   ```typescript
   // Initialize providers on-demand, not at module load
   export function getAnthropicClient() {
     return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
   }
   ```

### Caching Strategies

**Edge Cache (for static assets):**
- Configured automatically by Vercel
- HTML cached for short periods
- JavaScript/CSS cached long-term

**Function Response Caching:**
```typescript
// Set cache headers for stable responses
res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
```

## Scaling Considerations

### Current Architecture Scalability

- **Automatic:** Vercel scales serverless functions elastically
- **No limits:** Unlimited concurrent invocations (within provider API quotas)
- **Cost:** Only pay for actual invocations + duration

### When to Upgrade

| Metric | Action |
|--------|--------|
| >1000 monthly invocations | Monitor spending |
| >$100/month in function costs | Implement caching/deduplication |
| High error rate on one provider | Add fallback provider logic |

### Adding Features at Scale

1. **Message persistence:**
   - Add PostgreSQL database
   - Store conversations for replay
   - Implement user sessions

2. **User authentication:**
   - Add Auth0/Clerk
   - Per-user rate limiting
   - Usage analytics

3. **Caching layer:**
   - Add Redis for evaluation results
   - Cache common scenarios
   - Reduce provider API calls

## Security Checklist

- [ ] API keys stored in Vercel environment variables (not code)
- [ ] `.env.local` in `.gitignore` (never committed)
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Sensitive errors sanitized in API responses
- [ ] CORS headers configured if needed
- [ ] Environment variables not logged
- [ ] Regular security updates for dependencies

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Vercel CLI:** https://vercel.com/cli
- **Deploy Logs:** Vercel Dashboard → Deployments → Logs
- **Status Page:** https://www.vercelstatus.com

