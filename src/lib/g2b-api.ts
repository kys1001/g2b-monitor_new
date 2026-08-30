import { G2BApiResponse, G2BItem } from '@/types';

const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';

function getApiKey(): string {
  const apiKey = process.env.G2B_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    throw new Error('G2B_API_KEY environment variable is not configured.');
  }
  return apiKey;
}

function formatDatetime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}`;
}

async function fetchWithRetry(url: string, retries = 3): Promise<G2BApiResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      let data: G2BApiResponse;
      try {
        data = JSON.parse(text) as G2BApiResponse;
      } catch {
        // XML 오류 응답 처리
        const msgMatch = text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/);
        const codeMatch = text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/);
        throw new Error(`API 응답 오류: ${codeMatch?.[1] || msgMatch?.[1] || text.slice(0, 200)}`);
      }

      const header = data?.response?.header;
      if (header?.resultCode !== '00') {
        const code = header?.resultCode ?? '?';
        const msg = header?.resultMsg ?? '알 수 없는 오류';
        throw new Error(`API 오류 [${code}]: ${msg}`);
      }
      return data;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function fetchBidListByDate(
  beginDt: string,
  endDt: string,
  page = 1
): Promise<{ items: G2BItem[]; totalCount: number }> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    numOfRows: '999',
    pageNo: String(page),
    ServiceKey: apiKey,
    type: 'json',
    inqryDiv: '1',
    inqryBgnDt: beginDt,
    inqryEndDt: endDt,
  });

  const url = `${BASE_URL}/getBidPblancListInfoServc?${params}`;
  const data = await fetchWithRetry(url);
  const body = data.response.body;

  let items: G2BItem[] = [];
  const rawItems = body.items as unknown;
  if (rawItems && rawItems !== '') {
    items = Array.isArray(rawItems) ? (rawItems as G2BItem[]) : [rawItems as G2BItem];
  }

  return { items, totalCount: body.totalCount };
}

// 날짜 문자열 "YYYYMMDDHHmm" → Date
function parseDt(dt: string): Date {
  const y = parseInt(dt.slice(0, 4));
  const mo = parseInt(dt.slice(4, 6)) - 1;
  const d = parseInt(dt.slice(6, 8));
  const h = parseInt(dt.slice(8, 10));
  const mi = parseInt(dt.slice(10, 12));
  return new Date(y, mo, d, h, mi);
}

// 날짜 범위를 maxDays 단위 청크로 분할
function splitDateRange(beginDt: string, endDt: string, maxDays = 10): { begin: string; end: string }[] {
  const chunks: { begin: string; end: string }[] = [];
  const start = parseDt(beginDt);
  const end = parseDt(endDt);
  const chunkMs = maxDays * 24 * 60 * 60 * 1000;

  let cur = new Date(start);
  while (cur < end) {
    const chunkEnd = new Date(Math.min(cur.getTime() + chunkMs - 1, end.getTime()));
    chunks.push({ begin: formatDatetime(cur), end: formatDatetime(chunkEnd) });
    cur = new Date(chunkEnd.getTime() + 60 * 1000); // +1분
  }
  return chunks;
}

export async function fetchAllBidsByDate(beginDt: string, endDt: string): Promise<G2BItem[]> {
  const chunks = splitDateRange(beginDt, endDt, 10);
  const allItems: G2BItem[] = [];
  const seenKeys = new Set<string>();

  for (const chunk of chunks) {
    let page = 1;
    let chunkFetched = 0;
    while (true) {
      const { items, totalCount } = await fetchBidListByDate(chunk.begin, chunk.end, page);
      for (const item of items) {
        const key = `${item.bidNtceNo}-${item.bidNtceOrd}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allItems.push(item);
        }
      }
      chunkFetched += items.length;
      if (items.length === 0 || chunkFetched >= totalCount) break;
      page++;
    }
  }

  return allItems;
}

export async function searchBidByKeyword(
  keyword: string,
  beginDt: string,
  endDt: string
): Promise<G2BItem[]> {
  const apiKey = getApiKey();

  const params = new URLSearchParams({
    numOfRows: '999',
    pageNo: '1',
    ServiceKey: apiKey,
    type: 'json',
    inqryDiv: '1',
    inqryBgnDt: beginDt,
    inqryEndDt: endDt,
    bidNtceNm: keyword,
  });

  const url = `${BASE_URL}/getBidPblancListInfoServcPPSSrch?${params}`;
  const data = await fetchWithRetry(url);
  const body = data.response.body;

  const rawItems2 = body.items as unknown;
  if (!rawItems2 || rawItems2 === '') return [];
  return Array.isArray(rawItems2) ? (rawItems2 as G2BItem[]) : [rawItems2 as G2BItem];
}

export function getTodayRange(): { begin: string; end: string } {
  const now = new Date();
  const begin = new Date(now);
  begin.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 0, 0);
  return {
    begin: formatDatetime(begin),
    end: formatDatetime(end),
  };
}

export function getYesterdayRange(): { begin: string; end: string } {
  const now = new Date();
  const begin = new Date(now);
  begin.setDate(begin.getDate() - 1);
  begin.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 0, 0);
  return {
    begin: formatDatetime(begin),
    end: formatDatetime(end),
  };
}
