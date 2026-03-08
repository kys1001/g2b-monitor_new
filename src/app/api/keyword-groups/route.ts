import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const groups = db.prepare('SELECT * FROM keyword_groups ORDER BY id').all();
  const keywords = db.prepare('SELECT * FROM keywords ORDER BY id').all();
  const result = (groups as Record<string, unknown>[]).map((g) => ({
    ...g,
    keywords: (keywords as Record<string, unknown>[]).filter((k) => k.group_id === (g as { id: number }).id),
  }));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { name, priority } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const result = db.prepare('INSERT INTO keyword_groups (name, priority) VALUES (?, ?)').run(name.trim(), priority || 'normal');
  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, name, priority, is_active } = await req.json();
  if (name !== undefined) db.prepare('UPDATE keyword_groups SET name = ? WHERE id = ?').run(name, id);
  if (priority !== undefined) db.prepare('UPDATE keyword_groups SET priority = ? WHERE id = ?').run(priority, id);
  if (is_active !== undefined) db.prepare('UPDATE keyword_groups SET is_active = ? WHERE id = ?').run(is_active, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json();
  db.prepare('DELETE FROM keyword_groups WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
