import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const logs = db.prepare('SELECT * FROM collection_logs ORDER BY id DESC LIMIT 100').all();
  return NextResponse.json(logs);
}
