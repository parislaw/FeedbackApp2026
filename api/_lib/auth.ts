// Better Auth server configuration — email/password + admin plugin + Resend emails
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { Resend } from 'resend';
import { db, user, session, account, verification, credits } from './db.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Accord <noreply@accord.app>';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPasswordToken: async ({ user: u, url }) => {
      await resend.emails.send({
        from: fromEmail,
        to: u.email,
        subject: 'Reset your Accord password',
        html: `
          <p>Hi ${u.name},</p>
          <p>Click the link below to reset your Accord password. This link expires in 1 hour.</p>
          <p><a href="${url}">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          try {
            await db.insert(credits).values({ userId: newUser.id, balance: 3 }).onConflictDoNothing();
          } catch (err) {
            console.error('[auth] failed to initialize credits for user', newUser.id, err);
            // Do not rethrow — user creation should still succeed
          }
        },
      },
    },
  },

  plugins: [admin()],

  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    },
  },
});

// Helper: extract Better Auth session from a Vercel request's headers
export async function getSessionFromHeaders(
  reqHeaders: Record<string, string | string[] | undefined>
): Promise<typeof auth.$Infer.Session | null> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(reqHeaders)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  return auth.api.getSession({ headers });
}
