'use client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

function toApiDate(dateStr: string, isEnd: boolean): string {
  // dateStr: "YYYY-MM-DD" → "YYYYMMDDHHMM"
  const d = dateStr.replace(/-/g, '');
  return d + (isEnd ? '2359' : '0000');
}

function getDefaultRange() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  const prev = new Date(now);
  prev.setDate(prev.getDate() - 7);
  const py = prev.getFullYear();
  const pm = String(prev.getMonth() + 1).padStart(2, '0');
  const pd = String(prev.getDate()).padStart(2, '0');
  const weekAgo = `${py}-${pm}-${pd}`;

  return { from: weekAgo, to: today };
}

export function Header() {
  const [collecting, setCollecting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const defaults = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const { toast } = useToast();

  async function handleCollect() {
    if (!dateFrom || !dateTo) {
      toast({ title: '날짜를 입력하세요', variant: 'destructive' });
      return;
    }
    if (dateFrom > dateTo) {
      toast({ title: '시작일이 종료일보다 늦을 수 없습니다', variant: 'destructive' });
      return;
    }
    setPopoverOpen(false);
    setCollecting(true);
    try {
      const range = {
        begin: toApiDate(dateFrom, false),
        end: toApiDate(dateTo, true),
      };
      const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: '수집 실패', description: data.error, variant: 'destructive' });
      } else {
        toast({
          title: '수집 완료',
          description: `API 수집 ${data.totalFetched}건 | 신규 저장 ${data.newSaved}건 | 키워드 매칭 ${data.matched}건`,
        });
        // 페이지 새로고침으로 대시보드 업데이트
        window.location.reload();
      }
    } catch {
      toast({ title: '오류', description: '수집 중 오류가 발생했습니다', variant: 'destructive' });
    } finally {
      setCollecting(false);
    }
  }

  return (
    <header className="h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-slate-600 dark:text-slate-300">나라장터 용역 입찰공고 모니터링</h1>
      <div className="flex items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
              disabled={collecting}
            >
              📅 {dateFrom} ~ {dateTo}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <p className="text-xs font-semibold text-slate-600 mb-3">수집 기간 설정</p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">시작일</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">종료일</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                {[
                  { label: '오늘', days: 0 },
                  { label: '어제', days: 1 },
                  { label: '7일', days: 7 },
                  { label: '30일', days: 30 },
                ].map(({ label, days }) => (
                  <Button
                    key={label}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      const now = new Date();
                      const to = new Date(now);
                      const from = new Date(now);
                      if (days === 0) {
                        // 오늘
                      } else if (days === 1) {
                        from.setDate(from.getDate() - 1);
                        to.setDate(to.getDate() - 1);
                      } else {
                        from.setDate(from.getDate() - days);
                      }
                      const fmt = (d: Date) => {
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const dd2 = String(d.getDate()).padStart(2, '0');
                        return `${y}-${m}-${dd2}`;
                      };
                      setDateFrom(fmt(from));
                      setDateTo(fmt(to));
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          onClick={handleCollect}
          disabled={collecting}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
        >
          {collecting ? '⏳ 수집 중...' : '⚡ 지금 수집'}
        </Button>
      </div>
    </header>
  );
}
