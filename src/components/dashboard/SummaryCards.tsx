'use client';
interface Props {
  todayMatched: number;
  urgentCount: number;
  lastCollected: string | null;
}
export function SummaryCards({ todayMatched, urgentCount, lastCollected }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">오늘 신규 매칭</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{todayMatched}<span className="text-base font-normal text-slate-500 ml-1">건</span></p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">마감 임박 (3일 이내)</p>
        <p className="text-3xl font-bold text-amber-500 tabular-nums">{urgentCount}<span className="text-base font-normal text-slate-500 ml-1">건</span></p>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">마지막 수집</p>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lastCollected ? lastCollected.substring(0, 16) : '아직 수집 없음'}</p>
      </div>
    </div>
  );
}
