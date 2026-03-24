// GET  /api/admin/users — list all users (admin only)
// POST /api/admin/users — action: ban|unban|create (admin only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc } from 'drizzle-orm';
import { sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders, auth } from '../_lib/auth.js';
import { db, user } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') {
    const { action } = req.body as { action?: string };
    if (action === 'create') return handleCreate(req, res);
    return handleBan(req, res);
  }
  return sendError(res, 405, `Method ${req.method} not allowed`);
}

async function handleList(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  try {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt));

    return res.status(200).json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return sendError(res, 500, 'Failed to fetch users');
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  const { name, email, password, role } = req.body as {
    name: string; email: string; password: string; role?: string;
  };
  if (!name || !email || !password) return sendError(res, 400, 'Missing required fields: name, email, password');
  if (password.length < 8) return sendError(res, 400, 'Password must be at least 8 characters');

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
  }

  try {
    const result = await auth.api.createUser({
      body: { name, email, password, role: (role || 'user') as 'user' | 'admin' },
      headers,
    });
    return res.status(201).json({ ok: true, userId: result.user.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create user';
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('unique')) {
      return sendError(res, 409, 'A user with this email already exists');
    }
    console.error('Create user error:', error);
    return sendError(res, 500, msg);
  }
}

async function handleBan(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  const { userId, action } = req.body as { userId: string; action: 'ban' | 'unban' };
  if (!userId || !action) return sendError(res, 400, 'Missing required fields: userId, action');
  if (userId === session.user.id) return sendError(res, 400, 'Cannot ban yourself');

  try {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers.set(k, v);
    }

    if (action === 'ban') {
      await auth.api.banUser({ body: { userId }, headers });
    } else {
      await auth.api.unbanUser({ body: { userId }, headers });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ban/unban user error:', error);
    return sendError(res, 500, 'Failed to update user status');
  }
}
