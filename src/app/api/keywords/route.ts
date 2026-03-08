import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const keywords = db.prepare(`
    SELECT k.*, kg.name as group_name, kg.priority as group_priority
    FROM keywords k
    JOIN keyword_groups kg ON k.group_id = kg.id
    ORDER BY kg.id, k.id
  `).all();
  return NextResponse.json(keywords);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { group_id, keyword } = await req.json();
  if (!group_id || !keyword?.trim()) {
    return NextResponse.json({ error: 'group_id and keyword required' }, { status: 400 });
  }
  const result = db.prepare('INSERT INTO keywords (group_id, keyword) VALUES (?, ?)').run(group_id, keyword.trim());
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, keyword, is_active } = await req.json();
  if (keyword !== undefined) {
    db.prepare('UPDATE keywords SET keyword = ? WHERE id = ?').run(keyword, id);
  }
  if (is_active !== undefined) {
    db.prepare('UPDATE keywords SET is_active = ? WHERE id = ?').run(is_active, id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM keywords WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
