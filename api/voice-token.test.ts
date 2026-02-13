import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('POST /api/voice-token', () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.stubGlobal('console', { ...console, error: vi.fn() });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    vi.unstubAllGlobals();
  });

  it('returns 500 and no apiKey in body when GEMINI_API_KEY is unset', async () => {
    delete process.env.GEMINI_API_KEY;
    const handler = (await import('./voice-token')).default;
    const req = {
      method: 'POST',
      body: {},
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    const res = {
      statusCode: 200,
      _body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this._body = body;
        return this;
      },
    } as any;

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res._body).toBeDefined();
    const body = res._body as Record<string, unknown>;
    expect(body).not.toHaveProperty('apiKey');
    expect(body.error).toBeDefined();
  });

  it('returns 405 for non-POST', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const handler = (await import('./voice-token')).default;
    const req = {
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    const res = {
      statusCode: 200,
      _body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this._body = body;
        return this;
      },
    } as any;

    await handler(req, res);

    expect(res.statusCode).toBe(405);
  });
});
