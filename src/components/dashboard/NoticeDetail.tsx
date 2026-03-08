'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BidNotice } from '@/types';
import { formatPrice, formatPriceFull, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  notice: BidNotice | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function NoticeDetail({ notice, open, onClose, onUpdate }: Props) {
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState('new');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadZip = async () => {
    if (!notice) return;

    // raw_data에서 ntceSpecDocUrl* 패턴으로 모든 첨부파일 추출
    let rawObj: Record<string, string> = {};
    try { rawObj = JSON.parse(notice.raw_data || '{}'); } catch { /* empty */ }

    const files: { url: string; name: string }[] = [];
    for (let i = 1; i <= 20; i++) {
      const url = rawObj[`ntceSpecDocUrl${i}`];
      const name = rawObj[`ntceSpecFileNm${i}`] || `첨부파일${i}`;
      if (url) files.push({ url, name });
    }
    // raw_data가 없거나 비어있으면 DB 컬럼 fallback
    if (files.length === 0) {
      if (notice.ntce_spec_doc_url1) files.push({ url: notice.ntce_spec_doc_url1, name: notice.ntce_spec_file_nm1 || '첨부파일1' });
      if (notice.ntce_spec_doc_url2) files.push({ url: notice.ntce_spec_doc_url2, name: notice.ntce_spec_file_nm2 || '첨부파일2' });
    }

    if (!files.length) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, zipName: notice.bid_ntce_nm.slice(0, 50) }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: '다운로드 실패', description: err.error, variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${notice.bid_ntce_nm.slice(0, 50)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: '다운로드 실패', description: '네트워크 오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!notice) return;
    setSaving(true);
    try {
      await fetch(`/api/notices/${notice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, memo }),
      });
      toast({ title: '저장 완료' });
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (!notice) return null;

  const keywords = notice.matched_keywords ? notice.matched_keywords.split(',').filter(Boolean) : [];

  // bidNtceDtlUrl이 없을 경우 공고번호+차수로 URL 구성
  const noticeUrl = notice.bid_ntce_dtl_url ||
    (notice.bid_ntce_no
      ? `https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=${notice.bid_ntce_no}&bidPbancOrd=${notice.bid_ntce_ord || '000'}`
      : '');

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base leading-tight">{notice.bid_ntce_nm}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            {keywords.map(kw => (
              <Badge key={kw} variant="secondary" className="bg-yellow-100 text-yellow-800">{kw}</Badge>
            ))}
            <Badge variant="outline">{notice.ntce_kind_nm}</Badge>
            <Badge variant="outline">{notice.srvce_div_nm}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
            <div><p className="text-xs text-slate-400">공고기관</p><p className="font-medium">{notice.ntce_instt_nm}</p></div>
            <div><p className="text-xs text-slate-400">수요기관</p><p className="font-medium">{notice.dminstt_nm}</p></div>
            <div><p className="text-xs text-slate-400">공고일시</p><p className="font-medium">{formatDateTime(notice.bid_ntce_dt)}</p></div>
            <div><p className="text-xs text-slate-400">마감일시</p><p className="font-medium text-amber-600">{formatDateTime(notice.bid_close_dt)}</p></div>
            <div><p className="text-xs text-slate-400">추정가격</p><p className="font-bold text-blue-600">{formatPrice(notice.presmpt_prce)}</p><p className="text-xs text-slate-400">{formatPriceFull(notice.presmpt_prce)}</p></div>
            <div><p className="text-xs text-slate-400">배정예산</p><p className="font-medium">{formatPrice(notice.asign_bdgt_amt)}</p></div>
            <div><p className="text-xs text-slate-400">입찰방식</p><p className="font-medium">{notice.bid_mthd_nm}</p></div>
            <div><p className="text-xs text-slate-400">계약방법</p><p className="font-medium">{notice.cntrct_cncls_mthd_nm}</p></div>
          </div>

          {(notice.tech_ablt_evl_rt || notice.bid_prce_evl_rt) && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-2">평가비율</p>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">기술 {notice.tech_ablt_evl_rt}%</span>
                <span className="text-slate-300">:</span>
                <span className="text-orange-500 font-bold">가격 {notice.bid_prce_evl_rt}%</span>
              </div>
            </div>
          )}

          {notice.ntce_instt_ofcl_nm && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">담당자</p>
              <p>{notice.ntce_instt_ofcl_nm}</p>
              {notice.ntce_instt_ofcl_tel_no && <p className="text-slate-500">{notice.ntce_instt_ofcl_tel_no}</p>}
              {notice.ntce_instt_ofcl_email && <p className="text-slate-500">{notice.ntce_instt_ofcl_email}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {noticeUrl && (
              <a href={noticeUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">🔗 공고 원문 보기</Button>
              </a>
            )}
            {(() => {
              let rawObj: Record<string, string> = {};
              try { rawObj = JSON.parse(notice.raw_data || '{}'); } catch { /* empty */ }
              let fileCount = 0;
              for (let i = 1; i <= 20; i++) { if (rawObj[`ntceSpecDocUrl${i}`]) fileCount++; }
              if (fileCount === 0) {
                if (notice.ntce_spec_doc_url1) fileCount++;
                if (notice.ntce_spec_doc_url2) fileCount++;
              }
              if (fileCount === 0) return null;
              return (
                <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={downloading} className="gap-1">
                  {downloading ? '⏳ 압축 중...' : `📦 첨부파일 ZIP 다운로드 (${fileCount}개)`}
                </Button>
              );
            })()}
            <p className="w-full text-xs text-slate-400 mt-1">공고번호: {notice.bid_ntce_no}-{notice.bid_ntce_ord}</p>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <p className="font-semibold mb-2">메모 및 상태</p>
            <Select defaultValue={notice.status || 'new'} onValueChange={setStatus}>
              <SelectTrigger className="mb-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-800 resize-none h-24"
              placeholder="메모 작성..."
              defaultValue={notice.memo || ''}
              onChange={e => setMemo(e.target.value)}
            />
            <Button size="sm" onClick={handleSave} disabled={saving} className={cn("mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white")}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
