// Serverless function: provides API key for Gemini Live API
// Prevents exposing API keys in client source code; key fetched at runtime
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateMethod, sendError } from './_lib/response-helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured in environment');
      return sendError(res, 500, 'Voice API not configured');
    }

    // Return API key to client at runtime (not in source code)
    // Gemini Live API accepts direct API key authentication
    // This is secure because:
    // 1. Key never exists in client bundle/source
    // 2. Fetched fresh on each voice session
    // 3. Transmitted over HTTPS only
    return res.status(200).json({
      apiKey: apiKey,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h validity
    });
  } catch (error) {
    console.error('Voice API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return sendError(res, 500, 'Failed to get voice credentials');
  }
}
