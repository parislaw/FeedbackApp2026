// Serverless function: issues ephemeral token for Gemini Live API
// API key stays server-side; client receives only a short-lived token
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { validateMethod, sendError } from './_lib/response-helpers.js';
import { validateRateLimit } from './_lib/rate-limit.js';

const TOKEN_SESSION_EXPIRE_MINUTES = 30;
const NEW_SESSION_EXPIRE_MINUTES = 1;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;
  if (!validateRateLimit(req, res)) return;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured in environment');
      return sendError(res, 500, 'Voice API not configured');
    }

    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + TOKEN_SESSION_EXPIRE_MINUTES * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + NEW_SESSION_EXPIRE_MINUTES * 60 * 1000).toISOString();

    const tokenData = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    if (!tokenData.name || typeof tokenData.name !== 'string') {
      console.error('Ephemeral token creation did not return a token name');
      return sendError(res, 500, 'Failed to generate voice token');
    }

    return res.status(200).json({
      token: tokenData.name,
      expiresAt: expireTime,
    });
  } catch (error) {
    console.error('Voice API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isAuthError = message.includes('API key') || message.includes('authentication') || message.includes('401');
    return sendError(res, 500, isAuthError ? 'Voice authentication failed' : 'Failed to get voice credentials');
  }
}
