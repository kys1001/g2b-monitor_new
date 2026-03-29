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

  // 카테고리(그룹) 선택 — 전체 대시보드 필터
  const [activeGroupId, setActiveGroupId] = useState('');

  // 공고 목록 세부 필터
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
    if (activeGroupId) params.set('groupId', activeGroupId);
    if (filterKeyword) params.set('keyword', filterKeyword);
    if (filterInstitution) params.set('institution', filterInstitution);
    if (filterSrvce) params.set('srvceDivNm', filterSrvce);
    if (checkedKeywords.size > 0) params.set('matchedKeyword', [...checkedKeywords].join(','));

    const res = await fetch(`/api/notices?${params}`);
    const data = await res.json();
    setNotices(data.notices);
    setTotal(data.total);
  }, [page, tab, activeGroupId, filterKeyword, filterInstitution, filterSrvce, sortBy, checkedKeywords]);

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeGroupId) params.set('groupId', activeGroupId);
    const res = await fetch(`/api/dashboard?${params}`);
    const data = await res.json();
    setStats(data);
  }, [activeGroupId]);

  const fetchGroups = useCallback(async () => {
    const res = await fetch('/api/keyword-groups');
    const data = await res.json();
    setGroups(data);
  }, []);

  useEffect(() => { fetchNotices(); }, [fetchNotices]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  // 카테고리 변경 시 키워드 체크 초기화
  const handleCategoryChange = (groupId: string) => {
    setActiveGroupId(groupId);
    setPage(1);
    clearCheckedKeywords();
  };

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
    setNotices(prev => prev.map(n => n.id === notice.id ? { ...n, is_favorite: newVal } : n));
    if (selected?.id === notice.id) setSelected(prev => prev ? { ...prev, is_favorite: newVal } : prev);

    await fetch(`/api/notices/${notice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: newVal }),
    });

    if (tab === 'favorites') fetchNotices();

    toast({
      title: newVal === 1 ? '★ 즐겨찾기 추가' : '즐겨찾기 해제',
      description: notice.bid_ntce_nm.slice(0, 40) + (notice.bid_ntce_nm.length > 40 ? '...' : ''),
    });
  };

  const totalPages = Math.ceil(total / 20);
  const activeGroup = groups.find(g => String(g.id) === activeGroupId);

  return (
    <div>
      {/* ── 카테고리 탭 ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-5">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-medium">카테고리 선택</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              activeGroupId === ''
                ? 'bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'
            }`}
          >
            전체
          </button>
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleCategoryChange(String(g.id))}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeGroupId === String(g.id)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
        {activeGroup && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            <span className="font-semibold">"{activeGroup.name}"</span> 카테고리 기준으로 필터링 중
          </p>
        )}
      </div>

      {/* ── 요약 카드 & 차트 ── */}
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

      {/* ── 공고 목록 ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        {/* Tab + Rematch */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs">
            <button
              onClick={() => { setTab('matched'); setPage(1); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'matched' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              🔑 키워드 매칭 공고
            </button>
            <button
              onClick={() => { setTab('favorites'); setPage(1); clearCheckedKeywords(); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'favorites' ? 'bg-yellow-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
            >
              ★ 관심 입찰 공고
            </button>
            <button
              onClick={() => { setTab('all'); setPage(1); clearCheckedKeywords(); }}
              className={`px-3 py-1.5 font-medium transition-colors ${tab === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'}`}
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
