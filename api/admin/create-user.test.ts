import { describe, it, expect, vi } from 'vitest';

// Mock the auth module
vi.mock('../_lib/auth.js', () => ({
  getSessionFromHeaders: vi.fn(),
  auth: {
    api: {
      createUser: vi.fn(),
    },
  },
}));

// Mock response helper
vi.mock('../_lib/response-helpers.js', () => ({
  sendError: vi.fn((res, status, msg) => res.status(status).json({ error: msg, status })),
}));

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
  } as unknown;
}

describe('POST /api/admin/create-user', () => {
  it('returns 405 for non-POST', async () => {
    const handler = (await import('./create-user')).default;
    const req = mockReq({}, 'GET');
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(405);
    expect(res._body).toBeDefined();
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('not allowed');
  });

  it('returns 401 when no session', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce(null);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test', email: 'test@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(401);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Unauthorized');
  });

  it('returns 403 when user is not admin', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'user123', email: 'user@example.com', name: 'User', role: 'user' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test', email: 'test@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(403);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Forbidden');
  });

  it('returns 400 when name is missing', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ email: 'test@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(400);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 400 when email is missing', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(400);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 400 when password is missing', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'test@example.com' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(400);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Missing required fields');
  });

  it('returns 400 when password is less than 8 characters', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'test@example.com', password: 'pass123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(400);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('at least 8 characters');
  });

  it('returns 201 with userId on successful user creation', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);
    vi.mocked(auth.auth.api.createUser).mockResolvedValueOnce({
      user: { id: 'newuser123', email: 'test@example.com', name: 'Test User', role: 'user' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'test@example.com', password: 'password123', role: 'user' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(201);
    const body = res._body as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.userId).toBe('newuser123');
  });

  it('returns 201 with admin role when specified', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);
    vi.mocked(auth.auth.api.createUser).mockResolvedValueOnce({
      user: { id: 'newadmin123', email: 'admin2@example.com', name: 'Admin Two', role: 'admin' },
    } as never);

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Admin Two', email: 'admin2@example.com', password: 'password123', role: 'admin' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(201);
    const body = res._body as Record<string, unknown>;
    expect(body.userId).toBe('newadmin123');
  });

  it('returns 409 when email already exists', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);
    vi.mocked(auth.auth.api.createUser).mockRejectedValueOnce(new Error('User with email already exists'));

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'existing@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(409);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('already exists');
  });

  it('returns 409 for unique constraint violation', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);
    vi.mocked(auth.auth.api.createUser).mockRejectedValueOnce(new Error('Unique constraint violation on email'));

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'existing@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(409);
  });

  it('returns 500 on general auth errors', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);
    vi.mocked(auth.auth.api.createUser).mockRejectedValueOnce(new Error('Database connection failed'));

    const handler = (await import('./create-user')).default;
    const req = mockReq({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(500);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });
});
