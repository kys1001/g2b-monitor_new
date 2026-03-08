import cron from 'node-cron';
import { collectBidNotices } from './collector';

let initialized = false;

export function initScheduler() {
  if (initialized) return;
  initialized = true;

  const schedule1 = process.env.CRON_SCHEDULE_1 || '0 7 * * *';
  const schedule2 = process.env.CRON_SCHEDULE_2 || '0 13 * * *';

  cron.schedule(schedule1, async () => {
    console.log('[Scheduler] Morning collection started');
    const result = await collectBidNotices();
    console.log('[Scheduler] Done:', result);
  });

  cron.schedule(schedule2, async () => {
    console.log('[Scheduler] Afternoon collection started');
    const result = await collectBidNotices();
    console.log('[Scheduler] Done:', result);
  });

  console.log('[Scheduler] Initialized with schedules:', schedule1, schedule2);
}
