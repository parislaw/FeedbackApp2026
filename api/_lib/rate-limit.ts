// Simple in-memory rate limiter (per serverless instance).
// Limits: 60 requests per minute per IP. Use with validateRateLimit() in each handler.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError } from './response-helpers.js';

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60;

const store = new Map<string, { count: number; resetAt: number }>();

function getClientId(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    if (first) return first.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return realIp;
  return (req.socket?.remoteAddress as string) ?? 'unknown';
}

/**
 * Returns true if the request is within rate limit. If over limit, sends 429 and returns false.
 */
export function validateRateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const id = getClientId(req);
  const now = Date.now();
  let entry = store.get(id);

  if (!entry) {
    store.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    store.set(id, entry);
    return true;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    sendError(res, 429, 'Too many requests. Please try again in a minute.');
    return false;
  }
  return true;
}
