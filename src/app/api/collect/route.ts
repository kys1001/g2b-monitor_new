import { NextRequest, NextResponse } from 'next/server';
import { collectBidNotices } from '@/lib/collector';
import { getTodayRange } from '@/lib/g2b-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const range = body.range || getTodayRange();
    const result = await collectBidNotices(range);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
