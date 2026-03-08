import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const notice = db.prepare(`
    SELECT bn.*,
      bno.status, bno.memo, bno.id as note_id,
      GROUP_CONCAT(k.keyword, ',') as matched_keywords
    FROM bid_notices bn
    LEFT JOIN keyword_matches km ON bn.id = km.bid_notice_id
    LEFT JOIN keywords k ON km.keyword_id = k.id
    LEFT JOIN bid_notes bno ON bn.id = bno.bid_notice_id
    WHERE bn.id = ?
    GROUP BY bn.id
  `).get(parseInt(id));

  if (!notice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(notice);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getDb();
  const { id } = await params;
  const body = await req.json();
  const noticeId = parseInt(id);

  const existing = db.prepare('SELECT id, is_favorite FROM bid_notes WHERE bid_notice_id = ?').get(noticeId) as { id: number; is_favorite: number } | undefined;

  // 즐겨찾기 토글 전용 요청
  if ('is_favorite' in body) {
    const isFav = body.is_favorite ? 1 : 0;
    if (existing) {
      db.prepare("UPDATE bid_notes SET is_favorite = ?, updated_at = datetime('now', 'localtime') WHERE bid_notice_id = ?")
        .run(isFav, noticeId);
    } else {
      db.prepare('INSERT INTO bid_notes (bid_notice_id, status, memo, is_favorite) VALUES (?, ?, ?, ?)').run(noticeId, 'new', '', isFav);
    }
    return NextResponse.json({ ok: true, is_favorite: isFav });
  }

  // 메모/상태 업데이트
  const { status, memo } = body;
  if (existing) {
    db.prepare("UPDATE bid_notes SET status = ?, memo = ?, updated_at = datetime('now', 'localtime') WHERE bid_notice_id = ?")
      .run(status, memo, noticeId);
  } else {
    db.prepare('INSERT INTO bid_notes (bid_notice_id, status, memo) VALUES (?, ?, ?)').run(noticeId, status || 'new', memo || '');
  }

  return NextResponse.json({ ok: true });
}
