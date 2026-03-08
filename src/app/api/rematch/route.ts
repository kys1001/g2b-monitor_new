import { NextResponse } from 'next/server';
import { rematchAllKeywords } from '@/lib/collector';

export async function POST() {
  try {
    const matched = await rematchAllKeywords();
    return NextResponse.json({ matched });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
