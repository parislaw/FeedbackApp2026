// GET /api/reports — list user's reports; POST /api/reports — save a report
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, desc } from 'drizzle-orm';
import { sendError } from './_lib/response-helpers.js';
import { getSessionFromHeaders } from './_lib/auth.js';
import { db, reports } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');

  if (req.method === 'GET') {
    try {
      const userReports = await db
        .select()
        .from(reports)
        .where(eq(reports.userId, session.user.id))
        .orderBy(desc(reports.createdAt));
      return res.status(200).json({ reports: userReports });
    } catch (error) {
      console.error('List reports error:', error);
      return sendError(res, 500, 'Failed to fetch reports');
    }
  }

  if (req.method === 'POST') {
    try {
      const { scenarioId, scenarioTitle, provider, transcript, evaluation } = req.body as {
        scenarioId?: string; scenarioTitle?: string; provider?: string;
        transcript?: unknown; evaluation?: unknown;
      };
      if (!evaluation) return sendError(res, 400, 'Missing required field: evaluation');

      const [saved] = await db
        .insert(reports)
        .values({ userId: session.user.id, scenarioId, scenarioTitle, provider, transcript, evaluation })
        .returning({ id: reports.id });

      return res.status(201).json({ id: saved.id });
    } catch (error) {
      console.error('Save report error:', error);
      return sendError(res, 500, 'Failed to save report');
    }
  }

  return sendError(res, 405, `Method ${req.method} not allowed`);
}
