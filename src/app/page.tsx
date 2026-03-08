'use client';
import { useEffect, useState, useCallback } from 'react';
import { BidNotice, KeywordGroup } from '@/types';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { MatchChart } from '@/components/dashboard/MatchChart';
import { NoticeTable } from '@/components/dashboard/NoticeTable';
import { NoticeDetail } from '@/components/dashboard/NoticeDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type TabType = 'matched' | 'all' | 'favorites';

export default function DashboardPage() {
  const [notices, setNotices] = useState<BidNotice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabType>('matched');
  const [rematching, setRematching] = useState(false);
  const [stats, setStats] = useState<{
    todayMatched: number;
    urgentCount: number;
    lastCollected: string | null;
    keywordStats: { keyword: string; count: number }[];
  } | null>(null);
  const [groups, setGroups] = useState<KeywordGroup[]>([]);
  const [selected, setSelected] = useState<BidNotice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  // Filters
  const [filterGroup, setFilterGroup] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterInstitution, setFilterInstitution] = useState('');
  const [filterSrvce, setFilterSrvce] = useState('');
  const [sortBy, setSortBy] = useState('bid_ntce_dt');
  const [checkedKeywords, setCheckedKeywords] = useState<Set<string>>(new Set());

  const toggleKeyword = useCallback((kw: string) => {
    setCheckedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw); else next.add(kw);
      return next;
    });
    setPage(1);
    setTab('matched');
  }, []);

  const clearCheckedKeywords = useCallback(() => {
    setCheckedKeywords(new Set());
    setPage(1);
  }, []);

  const fetchNotices = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20', sortBy, sortOrder: 'desc' });
    if (tab === 'matched') params.set('matchedOnly', '1');
    if (tab === 'favorites') params.set('favoritesOnly', '1');
    if (filterGroup) params.set('groupId', filterGroup);
    if (filterKeyword) params.set('keyword', filterKeyword);
    if (filterInstitution) params.set('institution', filterInstitution);
    if (filterSrvce) params.set('srvceDivNm', filterSrvce);
    if (checkedKeywords.size > 0) params.set('matchedKeyword', [...checkedKeywords].join(','));

    const res = await fetch(`/api/notices?${params}`);
    const data = await res.json();
    setNotices(data.notices);
    setTotal(data.total);
  }, [page, tab, filterGroup, filterKeyword, filterInstitution, filterSrvce, sortBy, checkedKeywords]);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/dashboard');
    const data = await res.json();
    setStats(data);
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/keyword-groups');
    const data = await res.json();
    setGroups(data);
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);
  useEffect(() => { fetchStats(); fetchGroups(); }, [fetchStats, fetchGroups]);

  const handleRematch = async () => {
    setRematching(true);
    try {
      const res = await fetch('/api/rematch', { method: 'POST' });
      const data = await res.json();
      toast({ title: '재매칭 완료', description: `${data.matched}건 매칭됨` });
      fetchNotices();
      fetchStats();
    } catch {
      toast({ title: '오류', variant: 'destructive' });
    } finally {
      setRematching(false);
    }
  };

  const handleToggleFavorite = async (notice: BidNotice) => {
    const newVal = notice.is_favorite === 1 ? 0 : 1;
    // 낙관적 업데이트
    setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, is_favorite: newVal } : n));
    if (selected?.id === notice.id) setSelected(prev => prev ? { ...prev, is_favorite: newVal } : prev);

    await fetch(`/api/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: newVal }),
    });

    // 즐겨찾기 탭이면 목록 새로고침
    if (tab === 'favorites') fetchNotices();

    toast({
      title: newVal === 1 ? '★ 즐겨찾기 추가' : '즐겨찾기 해제',
      description: notice.bid_ntce_nm.slice(0, 40) + (notice.bid_ntce_nm.length > 40 ? '...' : ''),
    });
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      {stats && (
        <>
          <SummaryCards
            todayMatched={stats.todayMatched}
            urgentCount={stats.urgentCount}
            lastCollected={stats.lastCollected}
          />
          {stats.keywordStats?.length > 0 && (
            <MatchChart
              data={stats.keywordStats}
              selectedKeywords={checkedKeywords}
              onToggle={toggleKeyword}
              onClear={clearCheckedKeywords}
            />
          )}
        </>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        {/* Tab + Rematch */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
            <button
              onClick={() => { setTab('matched'); setPage(1); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'matched' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}
            >
              🔑 키워드 매칭 공고
            </button>
            <button
              onClick={() => { setTab('favorites'); setPage(1); setFilterGroup(''); clearCheckedKeywords(); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'favorites' ? 'bg-yellow-500 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}
            >
              ★ 관심 입찰 공고
            </button>
            <button
              onClick={() => { setTab('all'); setPage(1); setFilterGroup(''); clearCheckedKeywords(); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400'}`}
            >
              📋 전체 수집 공고
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs ml-auto"
            onClick={handleRematch}
            disabled={rematching}
            title="수집된 전체 공고에 키워드 재매칭 실행"
          >
            {rematching ? '⏳ 재매칭 중...' : '🔄 키워드 재매칭'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tab === 'matched' && (
            <Select value={filterGroup} onValueChange={v => { setFilterGroup(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="키워드 그룹" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 그룹</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            className="w-44 h-8 text-xs"
            placeholder="공고명 검색..."
            value={filterKeyword}
            onChange={e => { setFilterKeyword(e.target.value); setPage(1); }}
          />

          <Input
            className="w-36 h-8 text-xs"
            placeholder="기관명 검색..."
            value={filterInstitution}
            onChange={e => { setFilterInstitution(e.target.value); setPage(1); }}
          />

          <Select value={filterSrvce} onValueChange={v => { setFilterSrvce(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="용역구분" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="일반용역">일반용역</SelectItem>
              <SelectItem value="기술용역">기술용역</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bid_ntce_dt">공고일순</SelectItem>
              <SelectItem value="bid_close_dt">마감일순</SelectItem>
              <SelectItem value="presmpt_prce">금액순</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-xs text-slate-400 flex items-center">
            총 {total.toLocaleString()}건
          </div>
        </div>

        <NoticeTable
          notices={notices}
          onSelect={n => { setSelected(n); setDetailOpen(true); }}
          onToggleFavorite={handleToggleFavorite}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
            <span className="text-xs text-slate-500">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
          </div>
        )}
      </div>

      <NoticeDetail
        notice={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdate={() => { fetchNotices(); fetchStats(); }}
      />
    </div>
  );
}
