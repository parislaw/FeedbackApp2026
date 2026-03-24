// GET /api/admin/reports — paginated list of all users' reports (admin only)
// ?all=true — skip pagination, return all reports (for heatmap/CSV export)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { desc, eq } from 'drizzle-orm';
import { validateMethod, sendError } from '../_lib/response-helpers.js';
import { getSessionFromHeaders } from '../_lib/auth.js';
import { db, reports, user } from '../_lib/db.js';

const PAGE_SIZE = 20;

const SELECT_FIELDS = {
  id: reports.id,
  scenarioTitle: reports.scenarioTitle,
  provider: reports.provider,
  createdAt: reports.createdAt,
  userId: reports.userId,
  userName: user.name,
  userEmail: user.email,
  evaluation: reports.evaluation,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, 'GET')) return;

  const session = await getSessionFromHeaders(req.headers);
  if (!session) return sendError(res, 401, 'Unauthorized');
  if (session.user.role !== 'admin') return sendError(res, 403, 'Forbidden');

  try {
    const fetchAll = req.query.all === 'true';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const offset = (page - 1) * PAGE_SIZE;
    const filterUserId = req.query.userId as string | undefined;

    const baseQuery = db
      .select(SELECT_FIELDS)
      .from(reports)
      .leftJoin(user, eq(reports.userId, user.id))
      .orderBy(desc(reports.createdAt));

    let rows;
    if (fetchAll) {
      rows = filterUserId
        ? await baseQuery.where(eq(reports.userId, filterUserId))
        : await baseQuery;
    } else {
      rows = filterUserId
        ? await baseQuery.where(eq(reports.userId, filterUserId)).limit(PAGE_SIZE).offset(offset)
        : await baseQuery.limit(PAGE_SIZE).offset(offset);
    }

    return res.status(200).json({ reports: rows, page: fetchAll ? 1 : page, pageSize: fetchAll ? rows.length : PAGE_SIZE });
  } catch (error) {
    console.error('Admin reports error:', error);
    return sendError(res, 500, 'Failed to fetch reports');
  }
}
