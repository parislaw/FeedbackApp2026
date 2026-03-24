// GET  /api/admin/users — list all users (admin only)
// POST /api/admin/users — ban/unban a user (admin only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc } from 'drizzle-orm';
import { sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders, auth } from '../_lib/auth.js';
import { db, user } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleList(req, res);
  if (req.method === 'POST') return handleBan(req, res);
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
