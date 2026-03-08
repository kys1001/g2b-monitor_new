'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  data: { keyword: string; count: number }[];
  selectedKeywords: Set<string>;
  onToggle: (keyword: string) => void;
  onClear: () => void;
}

const COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16'];

export function MatchChart({ data, selectedKeywords, onToggle, onClear }: Props) {
  if (!data.length) return null;

  const hasSelection = selectedKeywords.size > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">키워드별 매칭 현황</p>
        {hasSelection && (
          <button onClick={onClear} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            전체 해제
          </button>
        )}
      </div>

      {/* Recharts 막대그래프 */}
      <ResponsiveContainer width="100%" height={Math.max(80, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="keyword" tick={{ fontSize: 11 }} width={90} />
          <Tooltip formatter={(val) => [`${val}건`, '매칭 수']} cursor={{ fill: '#f1f5f940' }} />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            onClick={(entry: { keyword: string }) => onToggle(entry.keyword)}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry, i) => {
              const isSelected = selectedKeywords.has(entry.keyword);
              const isDimmed = hasSelection && !isSelected;
              return (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  opacity={isDimmed ? 0.25 : 1}
                  stroke={isSelected ? '#1e40af' : 'none'}
                  strokeWidth={2}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 체크박스 목록 */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-1.5">
        {data.map((item, i) => {
          const isChecked = selectedKeywords.has(item.keyword);
          return (
            <label key={item.keyword} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(item.keyword)}
                className="w-3.5 h-3.5 rounded cursor-pointer"
                style={{ accentColor: COLORS[i % COLORS.length] }}
              />
              <span className={`text-xs ${isChecked ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                {item.keyword}
              </span>
            </label>
          );
        })}
      </div>

      {hasSelection && (
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          {[...selectedKeywords].join(', ')} — {selectedKeywords.size}개 키워드 필터 적용 중
        </p>
      )}
    </div>
  );
}
