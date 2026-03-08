'use client';
import { BidNotice } from '@/types';
import { formatPrice, formatDateShort, getDaysUntilClose, isUrgent, isClosed, STATUS_LABELS, STATUS_COLORS, highlightKeywords, getNoticeBadges } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  notices: BidNotice[];
  onSelect: (notice: BidNotice) => void;
  onToggleFavorite: (notice: BidNotice) => void;
}

export function NoticeTable({ notices, onSelect, onToggleFavorite }: Props) {
  if (!notices.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-4xl mb-3">🔍</p>
        <p>공고가 없습니다.</p>
        <p className="text-xs mt-1">키워드를 추가하거나 수집을 실행해보세요.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-500">
            <th className="pb-2 font-medium w-8"></th>
            <th className="pb-2 font-medium pr-4">공고명</th>
            <th className="pb-2 font-medium pr-4 whitespace-nowrap">공고기관</th>
            <th className="pb-2 font-medium pr-4 whitespace-nowrap">추정가격</th>
            <th className="pb-2 font-medium pr-4 whitespace-nowrap">공고일</th>
            <th className="pb-2 font-medium pr-4 whitespace-nowrap">마감일</th>
            <th className="pb-2 font-medium pr-4 whitespace-nowrap">매칭키워드</th>
            <th className="pb-2 font-medium whitespace-nowrap">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {notices.map(notice => {
            const daysLeft = getDaysUntilClose(notice.bid_close_dt);
            const urgent = isUrgent(notice.bid_close_dt);
            const closed = isClosed(notice.bid_close_dt);
            const keywords = notice.matched_keywords ? notice.matched_keywords.split(',').filter(Boolean) : [];
            const status = notice.status || 'new';
            const isFav = notice.is_favorite === 1;
            const noticeBadges = getNoticeBadges(notice);

            return (
              <tr
                key={notice.id}
                onClick={() => onSelect(notice)}
                className={cn(
                  'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                  urgent && !closed && 'bg-amber-50/50 dark:bg-amber-900/10',
                  closed && 'opacity-60'
                )}
              >
                {/* 즐겨찾기 별표 */}
                <td className="py-2.5 pr-1 w-8">
                  <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(notice); }}
                    className={cn(
                      'text-lg leading-none transition-colors',
                      isFav ? 'text-yellow-400 hover:text-yellow-500' : 'text-slate-200 hover:text-yellow-300 dark:text-slate-600 dark:hover:text-yellow-400'
                    )}
                    title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </td>

                <td className="py-2.5 pr-4 max-w-xs">
                  <div
                    className="font-medium text-slate-800 dark:text-slate-200 leading-tight line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: highlightKeywords(notice.bid_ntce_nm, keywords) }}
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {noticeBadges.map(b => (
                      <span key={b.label} className={`inline-block text-[10px] font-semibold px-1.5 py-0 rounded leading-5 ${b.className}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs max-w-[100px] truncate">
                  {notice.ntce_instt_nm}
                </td>
                <td className="py-2.5 pr-4 text-blue-600 font-semibold whitespace-nowrap tabular-nums">
                  {formatPrice(notice.presmpt_prce)}
                </td>
                <td className="py-2.5 pr-4 text-slate-500 whitespace-nowrap text-xs tabular-nums">
                  {formatDateShort(notice.bid_ntce_dt)}
                </td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-xs tabular-nums">
                  <span className={cn(urgent && !closed ? 'text-amber-600 font-semibold' : 'text-slate-500', closed && 'text-red-400 line-through')}>
                    {formatDateShort(notice.bid_close_dt)}
                  </span>
                  {urgent && !closed && (
                    <span className="ml-1 text-amber-500 text-xs">D-{daysLeft}</span>
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {keywords.slice(0, 2).map(kw => (
                      <Badge key={kw} variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        {kw}
                      </Badge>
                    ))}
                    {keywords.length > 2 && (
                      <Badge variant="secondary" className="text-xs">+{keywords.length - 2}</Badge>
                    )}
                  </div>
                </td>
                <td className="py-2.5">
                  <Badge className={cn('text-xs', STATUS_COLORS[status])}>
                    {STATUS_LABELS[status] || status}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
