import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);

  const groupId = searchParams.get('groupId');
  const keyword = searchParams.get('keyword');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const priceFrom = searchParams.get('priceFrom');
  const priceTo = searchParams.get('priceTo');
  const institution = searchParams.get('institution');
  const srvceDivNm = searchParams.get('srvceDivNm');
  const sortBy = searchParams.get('sortBy') || 'bid_ntce_dt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const matchedOnly = searchParams.get('matchedOnly') === '1';
  const matchedKeyword = searchParams.get('matchedKeyword');
  const favoritesOnly = searchParams.get('favoritesOnly') === '1';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // 탭 기반 기본 필터 (우선순위: 체크박스 키워드 > 즐겨찾기 > 매칭전체)
  if (matchedKeyword) {
    const kwList = matchedKeyword.split(',').map(s => s.trim()).filter(Boolean);
    const placeholders = kwList.map(() => '?').join(', ');
    conditions.push(`bn.id IN (
      SELECT DISTINCT km.bid_notice_id FROM keyword_matches km
      JOIN keywords k ON km.keyword_id = k.id
      WHERE k.keyword IN (${placeholders})
    )`);
    params.push(...kwList);
  } else if (favoritesOnly) {
    conditions.push(`bno.is_favorite = 1`);
  } else if (matchedOnly) {
    conditions.push(`bn.id IN (SELECT DISTINCT bid_notice_id FROM keyword_matches)`);
  }

  // 카테고리(그룹) 필터 — 위 조건과 중첩 적용
  if (groupId) {
    conditions.push(`bn.id IN (
      SELECT DISTINCT km.bid_notice_id FROM keyword_matches km
      JOIN keywords k ON km.keyword_id = k.id
      WHERE k.group_id = ?
    )`);
    params.push(parseInt(groupId));
  }

  if (keyword) {
    conditions.push(`bn.bid_ntce_nm LIKE ?`);
    params.push(`%${keyword}%`);
  }
  if (dateFrom) {
    conditions.push(`bn.bid_ntce_dt >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`bn.bid_ntce_dt <= ?`);
    params.push(dateTo + ' 23:59:59');
  }
  if (priceFrom) {
    conditions.push(`bn.presmpt_prce >= ?`);
    params.push(parseInt(priceFrom));
  }
  if (priceTo) {
    conditions.push(`bn.presmpt_prce <= ?`);
    params.push(parseInt(priceTo));
  }
  if (institution) {
    conditions.push(`(bn.ntce_instt_nm LIKE ? OR bn.dminstt_nm LIKE ?)`);
    params.push(`%${institution}%`, `%${institution}%`);
  }
  if (srvceDivNm) {
    conditions.push(`bn.srvce_div_nm = ?`);
    params.push(srvceDivNm);
  }
  if (status) {
    if (status === 'new') {
      conditions.push(`(bno.status = 'new' OR bno.status IS NULL)`);
    } else {
      conditions.push(`bno.status = ?`);
      params.push(status);
    }
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const validSortCols = ['bid_ntce_dt', 'bid_close_dt', 'presmpt_prce', 'rgst_dt'];
  const safeSort = validSortCols.includes(sortBy) ? sortBy : 'bid_ntce_dt';
  const safeOrder = sortOrder === 'asc' ? 'asc' : 'desc';

  const countSql = `
    SELECT COUNT(*) as total
    FROM bid_notices bn
    LEFT JOIN bid_notes bno ON bn.id = bno.bid_notice_id
    ${where}
  `;
  const countRow = db.prepare(countSql).get(...params) as { total: number };
  const total = countRow.total;

  const sql = `
    SELECT bn.*,
      bno.status, bno.memo, bno.id as note_id, bno.is_favorite,
      GROUP_CONCAT(DISTINCT k.keyword) as matched_keywords
    FROM bid_notices bn
    LEFT JOIN keyword_matches km ON bn.id = km.bid_notice_id
    LEFT JOIN keywords k ON km.keyword_id = k.id
    LEFT JOIN bid_notes bno ON bn.id = bno.bid_notice_id
    ${where}
    GROUP BY bn.id
    ORDER BY bn.${safeSort} ${safeOrder}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const notices = db.prepare(sql).all(...params);
  return NextResponse.json({ notices, total, page, limit });
}
