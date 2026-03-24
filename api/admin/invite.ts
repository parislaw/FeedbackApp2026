// POST /api/admin/invite — admin creates invitation + sends email via Resend
// GET  /api/admin/invite?token=xxx — validate an invitation token (public)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders } from '../_lib/auth.js';
import { db, invitations } from '../_lib/db.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Lumenalta <noreply@lumenalta.com>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleValidate(req, res);
  if (req.method === 'POST') return handleCreate(req, res);
  return sendError(res, 405, `Method ${req.method} not allowed`);
}

// Validate invitation token — used by InviteAcceptPage to pre-fill email
async function handleValidate(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string;
  if (!token) return sendError(res, 400, 'Missing token');

  const [invite] = await db
    .select({ email: invitations.email, expiresAt: invitations.expiresAt, usedAt: invitations.usedAt })
    .from(invitations)
    .where(eq(invitations.token, token));

  if (!invite) return sendError(res, 404, 'Invalid invitation token');
  if (invite.usedAt) return sendError(res, 410, 'Invitation has already been used');
  if (invite.expiresAt < new Date()) return sendError(res, 410, 'Invitation has expired');

  return res.status(200).json({ email: invite.email });
}

// Create invitation — admin only
async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  const { email } = req.body as { email: string };
  if (!email) return sendError(res, 400, 'Missing required field: email');

  try {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Upsert: re-invite if email already exists (reset token + expiry)
    await db
      .insert(invitations)
      .values({ email, token, invitedBy: session.user.id, expiresAt })
      .onConflictDoUpdate({
        target: invitations.email,
        set: { token, expiresAt, usedAt: null, invitedBy: session.user.id },
      });

    const inviteUrl = `${appUrl}/invite/${token}`;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "You've been invited to Lumenalta Feedback Practice",
      html: `
        <p>You've been invited to join Lumenalta Feedback Practice.</p>
        <p>Click the link below to set your password and activate your account. This link expires in 7 days.</p>
        <p><a href="${inviteUrl}">Accept Invitation</a></p>
      `,
    });

    return res.status(201).json({ ok: true, inviteUrl });
  } catch (error) {
    console.error('Create invite error:', error);
    return sendError(res, 500, 'Failed to create invitation');
  }
}
