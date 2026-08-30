/** 다이제스트/상세 조회가 함께 쓰는 표시 헬퍼. */

export function money(amt: number): string {
  if (!amt) return '미공개';
  if (amt >= 100_000_000) return `${(amt / 100_000_000).toFixed(1)}억원`;
  if (amt >= 10_000) return `${Math.round(amt / 10_000).toLocaleString()}만원`;
  return `${amt.toLocaleString()}원`;
}

/** "2026-08-30 18:00:00" → "08/30 18:00" */
export function shortDt(v: string): string {
  const m = v?.match(/^\d{4}-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/);
  return m ? `${m[1]}/${m[2]} ${m[3]}` : '';
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}
