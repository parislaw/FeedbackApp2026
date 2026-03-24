// Better Auth catch-all — converts Vercel's pre-parsed request to Web Request
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { auth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const host = req.headers.host || 'feedback-app2026.vercel.app';
    const url = new URL(req.url!, `https://${host}`);

    // Vercel pre-consumes the body stream; reconstruct from parsed body
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.body != null;
    const body = hasBody ? JSON.stringify(req.body) : undefined;

    console.log('[auth] method=%s path=%s hasBody=%s', req.method, url.pathname, hasBody);

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as HeadersInit,
      body,
    });

    const webResponse = await auth.handler(webRequest);

    console.log('[auth] response status=%d', webResponse.status);

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));

    const responseBody = await webResponse.text();
    if (responseBody) res.send(responseBody);
    else res.end();
  } catch (err) {
    console.error('[auth] error:', err);
    res.status(500).json({ error: 'Internal auth error', detail: String(err) });
  }
}
