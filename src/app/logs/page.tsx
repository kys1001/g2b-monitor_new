'use client';
import { useEffect, useState } from 'react';
import { CollectionLog } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function LogsPage() {
  const [logs, setLogs] = useState<CollectionLog[]>([]);

  useEffect(() => {
    fetch('/api/logs').then(r => r.json()).then(setLogs);
  }, []);

  return (
    <div>
      <h2 className="text-lg font-bold mb-6">수집 로그</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-2 font-medium">시작시간</th>
              <th className="px-4 py-2 font-medium">종료시간</th>
              <th className="px-4 py-2 font-medium">오퍼레이션</th>
              <th className="px-4 py-2 font-medium text-right">수집</th>
              <th className="px-4 py-2 font-medium text-right">저장</th>
              <th className="px-4 py-2 font-medium text-right">매칭</th>
              <th className="px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-2 text-xs tabular-nums text-slate-600 dark:text-slate-400">{log.started_at?.substring(0, 16)}</td>
                <td className="px-4 py-2 text-xs tabular-nums text-slate-600 dark:text-slate-400">{log.finished_at?.substring(0, 16)}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{log.api_operation}</td>
                <td className="px-4 py-2 text-xs text-right tabular-nums">{log.total_fetched?.toLocaleString()}</td>
                <td className="px-4 py-2 text-xs text-right tabular-nums text-blue-600">{log.new_saved?.toLocaleString()}</td>
                <td className="px-4 py-2 text-xs text-right tabular-nums text-green-600">{log.matched?.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {log.status === 'success' ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">성공</Badge>
                  ) : log.status === 'error' ? (
                    <div>
                      <Badge className="bg-red-100 text-red-700 text-xs">실패</Badge>
                      {log.error_message && <p className="text-xs text-red-500 mt-0.5">{log.error_message}</p>}
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">실행중</Badge>
                  )}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400 text-sm">로그가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
