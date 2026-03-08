import { NextRequest, NextResponse } from 'next/server';
import { searchBidByKeyword, getTodayRange } from '@/lib/g2b-api';

export async function POST(req: NextRequest) {
  const { keyword, beginDt, endDt } = await req.json();
  if (!keyword) return NextResponse.json({ error: 'keyword required' }, { status: 400 });

  const range = beginDt && endDt ? { begin: beginDt, end: endDt } : getTodayRange();

  try {
    const items = await searchBidByKeyword(keyword, range.begin, range.end);
    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
