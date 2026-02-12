// Serverless function: generates ephemeral tokens for Gemini Live API
// Prevents exposing API keys to client; tokens have limited lifetime (30 min)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMethod, sendError } from './_lib/response-helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return sendError(res, 500, 'Voice API not configured');
    }

    // Request ephemeral token from Google's API
    // Tokens are scoped to live connections and expire after ~30 minutes
    const tokenResponse = await fetch('https://generativelanguage.googleapis.com/v1alpha/cachedContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        // Ephemeral tokens don't require a pre-cached system instruction
        // The client sends system instruction directly in connection config
        ttlSeconds: 3600, // 1 hour token lifetime (max Google allows)
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token generation error:', error);
      return sendError(res, 500, 'Failed to generate voice token');
    }

    const tokenData = await tokenResponse.json();

    // Validate token response has required fields
    if (!tokenData.name) {
      console.error('Google API returned unexpected response:', tokenData);
      return sendError(res, 500, 'Failed to generate voice token');
    }

    // Parse expiration time (Google returns ISO 8601 format)
    const expiresAt = tokenData.expireTime
      ? new Date(tokenData.expireTime)
      : new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes

    // Return token to client; client uses this for WebSocket connection
    return res.status(200).json({
      token: tokenData.name,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Voice token API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication');
    const safeMessage = isAuthError ? 'Authentication failed' : 'Failed to generate voice token';
    return sendError(res, 500, safeMessage);
  }
}
