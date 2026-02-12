// Shared utilities for consistent API responses across all serverless functions
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function sendError(res: VercelResponse, status: number, message: string): VercelResponse {
  return res.status(status).json({ error: message, status });
}

export function validateMethod(req: VercelRequest, res: VercelResponse, method: string): boolean {
  if (req.method !== method) {
    sendError(res, 405, `Method ${req.method} not allowed`);
    return false;
  }
  return true;
}

// Strip markdown code fences if present (some LLMs wrap JSON in ```json...```)
export function parseJsonBody(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}
