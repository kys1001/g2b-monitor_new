import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const today = new Date().toISOString().substring(0, 10);
  const groupId = req.nextUrl.searchParams.get('groupId');
  const groupFilter = groupId ? 'AND k.group_id = ?' : '';
  const groupParam = groupId ? [groupId] : [];

  const todayMatched = groupId
    ? ((db.prepare(`
        SELECT COUNT(DISTINCT bn.id) as count
        FROM bid_notices bn
        JOIN keyword_matches km ON bn.id = km.bid_notice_id
        JOIN keywords k ON km.keyword_id = k.id
        WHERE DATE(bn.rgst_dt) = ? ${groupFilter}
      `).get(today, ...groupParam)) as { count: number } | undefined)?.count || 0
    : ((db.prepare(`
        SELECT COUNT(DISTINCT bn.id) as count
        FROM bid_notices bn
        JOIN keyword_matches km ON bn.id = km.bid_notice_id
        WHERE DATE(bn.rgst_dt) = ?
      `).get(today)) as { count: number } | undefined)?.count || 0;

  const urgentCount = groupId
    ? ((db.prepare(`
        SELECT COUNT(DISTINCT bn.id) as count
        FROM bid_notices bn
        JOIN keyword_matches km ON bn.id = km.bid_notice_id
        JOIN keywords k ON km.keyword_id = k.id
        WHERE bn.bid_close_dt > datetime('now', 'localtime')
        AND bn.bid_close_dt <= datetime('now', 'localtime', '+3 days')
        ${groupFilter}
      `).get(...groupParam)) as { count: number } | undefined)?.count || 0
    : ((db.prepare(`
        SELECT COUNT(DISTINCT bn.id) as count
        FROM bid_notices bn
        JOIN keyword_matches km ON bn.id = km.bid_notice_id
        WHERE bn.bid_close_dt > datetime('now', 'localtime')
        AND bn.bid_close_dt <= datetime('now', 'localtime', '+3 days')
      `).get()) as { count: number } | undefined)?.count || 0;

  const lastLog = db.prepare(`
    SELECT finished_at FROM collection_logs WHERE status = 'success' ORDER BY id DESC LIMIT 1
  `).get() as { finished_at: string } | undefined;

  const keywordStats = groupId
    ? db.prepare(`
        SELECT k.keyword, COUNT(DISTINCT km.bid_notice_id) as count
        FROM keywords k
        LEFT JOIN keyword_matches km ON k.id = km.keyword_id
        WHERE k.is_active = 1 AND k.group_id = ?
        GROUP BY k.id
        ORDER BY count DESC
      `).all(groupId)
    : db.prepare(`
        SELECT k.keyword, COUNT(DISTINCT km.bid_notice_id) as count
        FROM keywords k
        LEFT JOIN keyword_matches km ON k.id = km.keyword_id
        WHERE k.is_active = 1
        GROUP BY k.id
        ORDER BY count DESC
      `).all();

  return NextResponse.json({
    todayMatched,
    urgentCount,
    lastCollected: lastLog?.finished_at || null,
    keywordStats,
  });
}
