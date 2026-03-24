import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module
vi.mock('../_lib/auth.js', () => ({
  getSessionFromHeaders: vi.fn(),
}));

// Mock the db module
vi.mock('../_lib/db.js', () => ({
  db: {
    select: vi.fn(),
  },
  reports: {
    id: 'id',
    scenarioTitle: 'scenarioTitle',
    provider: 'provider',
    createdAt: 'createdAt',
    userId: 'userId',
  },
  user: {
    name: 'name',
    email: 'email',
    id: 'id',
  },
}));

// Mock response helper
vi.mock('../_lib/response-helpers.js', () => ({
  validateMethod: vi.fn((req, res, method) => req.method === method),
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

function mockReq(method = 'GET', query: Record<string, string | string[]> = {}) {
  return {
    method,
    query,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown;
}

describe('GET /api/admin/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    const auth = await import('../_lib/auth.js');
    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce(null);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET');
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

    const handler = (await import('./reports')).default;
    const req = mockReq('GET');
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(403);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toContain('Forbidden');
  });

  it('returns paginated reports on default page 1', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const mockQueryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        { id: '1', scenarioTitle: 'Scenario 1', provider: 'Gemini', userId: 'user1', userName: 'User 1' },
        { id: '2', scenarioTitle: 'Scenario 2', provider: 'OpenAI', userId: 'user2', userName: 'User 2' },
      ]),
    };

    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(mockQueryChain),
        }),
      }) as never,
    } as never);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET', {});
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(200);
    const body = res._body as Record<string, unknown>;
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
  });

  it('returns all reports without pagination when all=true', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const mockReports = [
      { id: '1', scenarioTitle: 'Scenario 1', provider: 'Gemini', userId: 'user1', userName: 'User 1' },
      { id: '2', scenarioTitle: 'Scenario 2', provider: 'OpenAI', userId: 'user2', userName: 'User 2' },
      { id: '3', scenarioTitle: 'Scenario 3', provider: 'Gemini', userId: 'user3', userName: 'User 3' },
    ];

    const mockQueryChain = {
      where: vi.fn().mockResolvedValue(mockReports),
    };

    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(Promise.resolve(mockReports) as never),
        }),
      }) as never,
    } as never);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET', { all: 'true' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(200);
    const body = res._body as Record<string, unknown>;
    expect(body.page).toBe(1);
    expect((body.reports as unknown[])?.length || 0).toBe(3);
  });

  it('filters by userId when specified with pagination', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const mockQueryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([
        { id: '1', scenarioTitle: 'Scenario 1', provider: 'Gemini', userId: 'user1', userName: 'User 1' },
      ]),
    };

    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(mockQueryChain),
        }),
      }) as never,
    } as never);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET', { userId: 'user1', page: '1' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(200);
    expect(mockQueryChain.where).toHaveBeenCalled();
  });

  it('filters by userId when specified with all=true', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const mockReports = [
      { id: '1', scenarioTitle: 'Scenario 1', provider: 'Gemini', userId: 'user1', userName: 'User 1' },
      { id: '2', scenarioTitle: 'Scenario 2', provider: 'OpenAI', userId: 'user1', userName: 'User 1' },
    ];

    const mockQueryChain = {
      where: vi.fn().mockResolvedValue(mockReports),
    };

    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(mockQueryChain),
        }),
      }) as never,
    } as never);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET', { all: 'true', userId: 'user1' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(200);
    const body = res._body as Record<string, unknown>;
    expect(body.pageSize).toBe(2);
    expect(mockQueryChain.where).toHaveBeenCalled();
  });

  it('handles page parameter for pagination', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    const mockQueryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(mockQueryChain),
        }),
      }) as never,
    } as never);

    const handler = (await import('./reports')).default;
    const req = mockReq('GET', { page: '2' });
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(200);
    const body = res._body as Record<string, unknown>;
    expect(body.page).toBe(2);
    expect(mockQueryChain.offset).toHaveBeenCalledWith(20);
  });

  it('returns 500 on database error', async () => {
    const auth = await import('../_lib/auth.js');
    const db = await import('../_lib/db.js');

    vi.mocked(auth.getSessionFromHeaders).mockResolvedValueOnce({
      user: { id: 'admin123', email: 'admin@example.com', name: 'Admin', role: 'admin' },
    } as never);

    vi.mocked(db.db.select).mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const handler = (await import('./reports')).default;
    const req = mockReq('GET');
    const res = mockRes();

    await handler(req as Parameters<typeof handler>[0], res as Parameters<typeof handler>[1]);

    expect(res.statusCode).toBe(500);
    const body = res._body as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });
});
