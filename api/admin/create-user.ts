// POST /api/admin/create-user — admin creates a user account directly (no invite email required)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders, auth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return sendError(res, 405, `Method ${req.method} not allowed`);

  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: string;
  };

  if (!name || !email || !password) {
    return sendError(res, 400, 'Missing required fields: name, email, password');
  }
  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
  }

  try {
    const result = await auth.api.createUser({
      body: {
        name,
        email,
        password,
        role: (role || 'user') as 'user' | 'admin',
      },
      headers,
    });

    return res.status(201).json({ ok: true, userId: result.user.id });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create user';
    // Better Auth throws when email already exists
    if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('unique')) {
      return sendError(res, 409, 'A user with this email already exists');
    }
    return sendError(res, 500, msg);
  }
}
