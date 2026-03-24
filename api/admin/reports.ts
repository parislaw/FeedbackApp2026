// GET /api/admin/reports — paginated list of all users' reports (admin only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc, eq } from 'drizzle-orm';
import { validateMethod, sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders } from '../_lib/auth.js';
import { db, reports, user } from '../_lib/db.js';

const PAGE_SIZE = 20;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'GET')) return;

  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const offset = (page - 1) * PAGE_SIZE;
    const filterUserId = req.query.userId as string | undefined;

    const query = db
      .select({
        id: reports.id,
        scenarioTitle: reports.scenarioTitle,
        provider: reports.provider,
        createdAt: reports.createdAt,
        userId: reports.userId,
        userName: user.name,
        userEmail: user.email,
        evaluation: reports.evaluation,
      })
      .from(reports)
      .leftJoin(user, eq(reports.userId, user.id))
      .orderBy(desc(reports.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset);

    const rows = filterUserId
      ? await db
          .select({
            id: reports.id,
            scenarioTitle: reports.scenarioTitle,
            provider: reports.provider,
            createdAt: reports.createdAt,
            userId: reports.userId,
            userName: user.name,
            userEmail: user.email,
            evaluation: reports.evaluation,
          })
          .from(reports)
          .leftJoin(user, eq(reports.userId, user.id))
          .where(eq(reports.userId, filterUserId))
          .orderBy(desc(reports.createdAt))
          .limit(PAGE_SIZE)
          .offset(offset)
      : await query;

    return res.status(200).json({ reports: rows, page, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error('Admin reports error:', error);
    return sendError(res, 500, 'Failed to fetch reports');
  }
}
