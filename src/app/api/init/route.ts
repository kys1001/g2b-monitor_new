import { NextResponse } from 'next/server';
import { initScheduler } from '@/lib/scheduler';

let schedulerStarted = false;

export async function GET() {
  if (!schedulerStarted) {
    initScheduler();
    schedulerStarted = true;
  }
  return NextResponse.json({ ok: true });
}
