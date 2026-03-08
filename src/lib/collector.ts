import { getDb } from './db';
import { fetchAllBidsByDate, getYesterdayRange } from './g2b-api';
import { G2BItem } from '@/types';
import Database from 'better-sqlite3';

function mapItemToRow(item: G2BItem) {
  return {
    bid_ntce_no: item.bidNtceNo || '',
    bid_ntce_ord: item.bidNtceOrd || '000',
    re_ntce_yn: item.reNtceYn || 'N',
    rgst_ty_nm: item.rgstTyNm || '',
    ntce_kind_nm: item.ntceKindNm || '',
    bid_ntce_nm: item.bidNtceNm || '',
    ntce_instt_cd: item.ntceInsttCd || '',
    ntce_instt_nm: item.ntceInsttNm || '',
    dminstt_cd: item.dminsttCd || '',
    dminstt_nm: item.dminsttNm || '',
    bid_mthd_nm: item.bidMethdNm || '',
    cntrct_cncls_mthd_nm: item.cntrctCnclsMthdNm || '',
    bid_ntce_dt: item.bidNtceDt || '',
    bid_begin_dt: item.bidBeginDt || '',
    bid_close_dt: item.bidClseDt || '',
    openg_dt: item.opengDt || '',
    ntce_instt_ofcl_nm: item.ntceInsttOfclNm || '',
    ntce_instt_ofcl_tel_no: item.ntceInsttOfclTelNo || '',
    ntce_instt_ofcl_email: item.ntceInsttOfclEmail || '',
    presmpt_prce: parseFloat(item.presmptPrce) || 0,
    asign_bdgt_amt: parseFloat(item.asignBdgtAmt) || 0,
    srvce_div_nm: item.srvceDivNm || '',
    tech_ablt_evl_rt: item.techAbltEvlRt || '',
    bid_prce_evl_rt: item.bidPrceEvlRt || '',
    bid_ntce_dtl_url: item.bidNtceDtlUrl || '',
    bid_ntce_url: item.bidNtceUrl || '',
    ntce_spec_doc_url1: item.ntceSpecDocUrl1 || '',
    ntce_spec_doc_url2: item.ntceSpecDocUrl2 || '',
    ntce_spec_file_nm1: item.ntceSpecFileNm1 || '',
    ntce_spec_file_nm2: item.ntceSpecFileNm2 || '',
    rgst_dt: item.rgstDt || '',
    raw_data: JSON.stringify(item),
  };
}

function matchKeywords(db: Database.Database, noticeId: number, bidNtceNm: string) {
  const keywords = db.prepare('SELECT id, keyword FROM keywords WHERE is_active = 1').all() as { id: number; keyword: string }[];
  const insertMatch = db.prepare('INSERT OR IGNORE INTO keyword_matches (bid_notice_id, keyword_id) VALUES (?, ?)');
  let matchCount = 0;
  for (const kw of keywords) {
    const terms = kw.keyword.split(/\s+/).filter(Boolean);
    const matched = terms.every(term => bidNtceNm.includes(term));
    if (matched) {
      insertMatch.run(noticeId, kw.id);
      matchCount++;
    }
  }
  return matchCount;
}

export async function collectBidNotices(dateRange?: { begin: string; end: string }): Promise<{
  totalFetched: number;
  newSaved: number;
  matched: number;
  error?: string;
}> {
  const db = getDb();
  const logId = db.prepare(`
    INSERT INTO collection_logs (started_at, api_operation, status)
    VALUES (datetime('now', 'localtime'), 'getBidPblancListInfoServc', 'running')
  `).run().lastInsertRowid;

  let totalFetched = 0;
  let newSaved = 0;
  let matched = 0;

  try {
    const range = dateRange || getYesterdayRange();
    const items = await fetchAllBidsByDate(range.begin, range.end);
    totalFetched = items.length;

    const insertNotice = db.prepare(`
      INSERT OR IGNORE INTO bid_notices (
        bid_ntce_no, bid_ntce_ord, re_ntce_yn, rgst_ty_nm, ntce_kind_nm,
        bid_ntce_nm, ntce_instt_cd, ntce_instt_nm, dminstt_cd, dminstt_nm,
        bid_mthd_nm, cntrct_cncls_mthd_nm, bid_ntce_dt, bid_begin_dt,
        bid_close_dt, openg_dt, ntce_instt_ofcl_nm, ntce_instt_ofcl_tel_no,
        ntce_instt_ofcl_email, presmpt_prce, asign_bdgt_amt, srvce_div_nm,
        tech_ablt_evl_rt, bid_prce_evl_rt, bid_ntce_dtl_url, bid_ntce_url,
        ntce_spec_doc_url1, ntce_spec_doc_url2, ntce_spec_file_nm1, ntce_spec_file_nm2,
        rgst_dt, raw_data
      ) VALUES (
        @bid_ntce_no, @bid_ntce_ord, @re_ntce_yn, @rgst_ty_nm, @ntce_kind_nm,
        @bid_ntce_nm, @ntce_instt_cd, @ntce_instt_nm, @dminstt_cd, @dminstt_nm,
        @bid_mthd_nm, @cntrct_cncls_mthd_nm, @bid_ntce_dt, @bid_begin_dt,
        @bid_close_dt, @openg_dt, @ntce_instt_ofcl_nm, @ntce_instt_ofcl_tel_no,
        @ntce_instt_ofcl_email, @presmpt_prce, @asign_bdgt_amt, @srvce_div_nm,
        @tech_ablt_evl_rt, @bid_prce_evl_rt, @bid_ntce_dtl_url, @bid_ntce_url,
        @ntce_spec_doc_url1, @ntce_spec_doc_url2, @ntce_spec_file_nm1, @ntce_spec_file_nm2,
        @rgst_dt, @raw_data
      )
    `);

    const batchInsert = db.transaction((items: G2BItem[]) => {
      for (const item of items) {
        const row = mapItemToRow(item);
        const result = insertNotice.run(row);
        if (result.changes > 0) {
          newSaved++;
          const noticeId = result.lastInsertRowid as number;
          matched += matchKeywords(db, noticeId, item.bidNtceNm);
        }
      }
    });

    batchInsert(items);

    // 전체 재매칭: 새 키워드 추가 시에도 기존 공고에 적용되도록
    db.prepare('DELETE FROM keyword_matches').run();
    const allNotices = db.prepare('SELECT id, bid_ntce_nm FROM bid_notices').all() as { id: number; bid_ntce_nm: string }[];
    matched = 0;
    for (const n of allNotices) {
      matched += matchKeywords(db, n.id, n.bid_ntce_nm);
    }

    db.prepare(`
      UPDATE collection_logs
      SET finished_at = datetime('now', 'localtime'), total_fetched = ?, new_saved = ?, matched = ?, status = 'success'
      WHERE id = ?
    `).run(totalFetched, newSaved, matched, logId);

    return { totalFetched, newSaved, matched };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE collection_logs
      SET finished_at = datetime('now', 'localtime'), status = 'error', error_message = ?
      WHERE id = ?
    `).run(errorMsg, logId);
    return { totalFetched, newSaved, matched, error: errorMsg };
  }
}

export async function rematchAllKeywords(): Promise<number> {
  const db = getDb();
  db.prepare('DELETE FROM keyword_matches').run();
  const notices = db.prepare('SELECT id, bid_ntce_nm FROM bid_notices').all() as { id: number; bid_ntce_nm: string }[];
  let total = 0;
  for (const notice of notices) {
    total += matchKeywords(db, notice.id, notice.bid_ntce_nm);
  }
  return total;
}
