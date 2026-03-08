import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
  if (!price) return '-';
  if (price >= 100000000) {
    return `${(price / 100000000).toFixed(1)}억`;
  }
  if (price >= 10000) {
    return `${Math.round(price / 10000).toLocaleString()}만`;
  }
  return price.toLocaleString() + '원';
}

export function formatPriceFull(price: number | null | undefined): string {
  if (!price) return '-';
  return price.toLocaleString() + '원';
}

export function getDaysUntilClose(closeDt: string): number {
  if (!closeDt) return 999;
  const now = new Date();
  const close = new Date(closeDt);
  const diff = close.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isUrgent(closeDt: string): boolean {
  const days = getDaysUntilClose(closeDt);
  return days >= 0 && days <= 3;
}

export function isClosed(closeDt: string): boolean {
  return getDaysUntilClose(closeDt) < 0;
}

export function highlightKeywords(text: string, keywords: string[]): string {
  if (!keywords.length) return text;
  const terms = [...new Set(keywords.flatMap(kw => kw.split(/\s+/).filter(Boolean)))];
  let result = text;
  for (const term of terms) {
    result = result.split(term).join(`<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">${term}</mark>`);
  }
  return result;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.substring(0, 10);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.substring(0, 16);
}

export const STATUS_LABELS: Record<string, string> = {
  new: '신규',
  interest: '관심',
  reviewing: '검토중',
  preparing: '입찰준비',
  pass: '패스',
};

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  interest: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  reviewing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  preparing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

// 공고 유형 뱃지 (정정·재공고·계약방식)
export interface NoticeBadge {
  label: string;
  className: string;
}

export function getNoticeBadges(notice: {
  ntce_kind_nm?: string;
  re_ntce_yn?: string;
  cntrct_cncls_mthd_nm?: string;
}): NoticeBadge[] {
  const badges: NoticeBadge[] = [];

  // 정정공고
  if (notice.ntce_kind_nm?.includes('정정')) {
    badges.push({ label: '정정', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800' });
  }

  // 재공고
  if (notice.re_ntce_yn === 'Y') {
    badges.push({ label: '재공고', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800' });
  }

  // 계약방식
  const method = notice.cntrct_cncls_mthd_nm || '';
  if (method.includes('수의')) {
    badges.push({ label: '수의', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800' });
  } else if (method.includes('제한')) {
    badges.push({ label: '제한', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800' });
  } else if (method.includes('일반')) {
    badges.push({ label: '일반', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800' });
  }

  return badges;
}

export const PRIORITY_LABELS: Record<string, string> = {
  core: '🔴 핵심',
  interest: '⭐ 관심',
  normal: '일반',
};

export const PRIORITY_COLORS: Record<string, string> = {
  core: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  interest: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  normal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};
