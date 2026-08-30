import cron from 'node-cron';
import { collectBidNotices } from './collector';

let initialized = false;

/**
 * 앱 내부 스케줄러.
 *
 * 기본은 꺼져 있다 — 정기 수집은 OpenClaw cron이 `npm run digest`를 돌리며
 * 담당하므로(하루 1회 + 디스코드 전송), 여기서도 돌리면 중복 수집이 된다.
 * 앱 단독으로 굴리고 싶을 때만 .env.local 에 CRON_SCHEDULES 를 지정한다.
 *
 *   CRON_SCHEDULES=0 7 * * *              # 오전 7시 1회
 *   CRON_SCHEDULES=0 7 * * *;0 13 * * *   # 세미콜론으로 복수 지정
 */
export function initScheduler() {
  if (initialized) return;
  initialized = true;

  const raw = process.env.CRON_SCHEDULES?.trim();
  if (!raw) {
    console.log('[Scheduler] Disabled (collection is driven by OpenClaw cron). Set CRON_SCHEDULES to enable.');
    return;
  }

  const schedules = raw.split(';').map(s => s.trim()).filter(Boolean);
  const active: string[] = [];

  for (const schedule of schedules) {
    if (!cron.validate(schedule)) {
      console.error(`[Scheduler] Invalid cron expression, skipped: "${schedule}"`);
      continue;
    }
    cron.schedule(schedule, async () => {
      console.log(`[Scheduler] Collection started (${schedule})`);
      const result = await collectBidNotices();
      console.log('[Scheduler] Done:', result);
    });
    active.push(schedule);
  }

  console.log('[Scheduler] Initialized with schedules:', active.join(' | ') || '(none valid)');
}
