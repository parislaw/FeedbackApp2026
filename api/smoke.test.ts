import { describe, it, expect } from 'vitest';

function mockRes() {
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
  };
  return res as ReturnType<typeof mockRes> & { statusCode: number; _body: unknown };
}

function mockReq(body: unknown, method = 'POST') {
  return {
    method,
    body,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
}

function assertNoCredentialInBody(body: unknown) {
  if (!body || typeof body !== 'object') return;
  const o = body as Record<string, unknown>;
  expect(o).not.toHaveProperty('apiKey');
  expect(o).not.toHaveProperty('GEMINI_API_KEY');
  if (typeof o.error === 'string') {
    expect(o.error).not.toMatch(/AIza/);
  }
}

describe('API smoke tests', () => {
  it('POST /api/chat with valid body returns 200 or 4xx/5xx and no credential in body', async () => {
    const chat = (await import('./chat')).default;
    const req = mockReq({
      provider: 'Gemini',
      scenario: {
        persona: { name: 'Test', roleDescription: 'Test', difficulty: 'Easy', characteristics: [] },
        assertions: [],
      },
      messages: [{ role: 'user', text: 'Hi' }],
    });
    const res = mockRes();
    await chat(req, res);
    expect([200, 400, 429, 500]).toContain(res.statusCode);
    assertNoCredentialInBody(res._body);
  });

  it('POST /api/evaluate with valid body returns 200 or 4xx/5xx and no credential in body', async () => {
    const evaluate = (await import('./evaluate')).default;
    const req = mockReq({
      provider: 'Gemini',
      scenario: { title: 'Test', context: 'Test', assertions: [] },
      transcript: [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello' }],
    });
    const res = mockRes();
    await evaluate(req, res);
    expect([200, 400, 429, 500]).toContain(res.statusCode);
    assertNoCredentialInBody(res._body);
  });

  it('POST /api/scenario with valid body returns 200 or 4xx/5xx and no credential in body', async () => {
    const scenario = (await import('./scenario')).default;
    const req = mockReq({ provider: 'Gemini', description: 'A test scenario' });
    const res = mockRes();
    await scenario(req, res);
    expect([200, 400, 429, 500]).toContain(res.statusCode);
    assertNoCredentialInBody(res._body);
  });

  it('POST /api/transcribe with valid body returns 200 or 4xx/5xx and no credential in body', async () => {
    const transcribe = (await import('./transcribe')).default;
    const req = mockReq({
      provider: 'Gemini',
      audio: 'dGVzdA==', // minimal base64
      audioMimeType: 'audio/webm',
    });
    const res = mockRes();
    await transcribe(req, res);
    expect([200, 400, 413, 429, 500]).toContain(res.statusCode);
    assertNoCredentialInBody(res._body);
  });

  it('POST /api/feedback-on-transcript with valid body returns 200 or 4xx/5xx and no credential in body', async () => {
    const feedback = (await import('./feedback-on-transcript')).default;
    const req = mockReq({
      provider: 'Gemini',
      transcript: [{ role: 'user', text: 'We need to talk about the missed deadlines.' }, { role: 'model', text: 'Okay.' }],
    });
    const res = mockRes();
    await feedback(req, res);
    expect([200, 400, 429, 500]).toContain(res.statusCode);
    assertNoCredentialInBody(res._body);
  });
});
