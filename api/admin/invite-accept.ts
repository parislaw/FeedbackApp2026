// POST /api/admin/invite-accept — validates token, creates user account, marks invitation used
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { validateMethod, sendError } from '../_lib/response-helpers.js';
import { auth } from '../_lib/auth.js';
import { db, invitations } from '../_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'POST')) return;

  const { token, name, password } = req.body as {
    token: string;
    name: string;
    password: string;
  };

  if (!token || !name || !password) {
    return sendError(res, 400, 'Missing required fields: token, name, password');
  }

  if (password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  try {
    // Validate the invitation token
    const [invite] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invite) return sendError(res, 404, 'Invalid invitation token');
    if (invite.usedAt) return sendError(res, 410, 'Invitation has already been used');
    if (invite.expiresAt < new Date()) return sendError(res, 410, 'Invitation has expired');

    // Create user account via Better Auth internal API
    const signUpResponse = await auth.api.signUpEmail({
      body: { email: invite.email, password, name },
    });

    if (!signUpResponse || !signUpResponse.user) {
      return sendError(res, 500, 'Failed to create user account');
    }

    // Mark invitation as used
    await db
      .update(invitations)
      .set({ usedAt: new Date() })
      .where(eq(invitations.token, token));

    return res.status(201).json({ ok: true, email: invite.email });
  } catch (error: unknown) {
    console.error('Accept invite error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to accept invitation';
    // Surface "email already exists" errors to the client
    if (msg.toLowerCase().includes('already')) {
      return sendError(res, 409, 'An account with this email already exists');
    }
    return sendError(res, 500, 'Failed to accept invitation');
  }
}
