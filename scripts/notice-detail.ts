/**
 * 다이제스트 목록에서 고른 공고의 상세 정보를 뽑는다.
 *
 * 사용자가 디스코드에서 번호로 답하면 OpenClaw 에이전트가 이 스크립트를 실행하고,
 * 출력된 원자료를 읽어 요약한다. 번호는 data/last-digest.json 에 저장된
 * 마지막 다이제스트 기준이다.
 *
 *   npm run notice -- 3                  # 마지막 다이제스트의 3번
 *   npm run notice -- R26BK01704156      # 공고번호로 직접 조회
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { money, shortDt } from './lib/format';

const INDEX_PATH = path.join(process.cwd(), 'data', 'last-digest.json');

type IndexFile = {
  generatedAt: string;
  totalMatched?: number;
  items: { no: number; id: number; bidNtceNo: string; bidNtceOrd: string; name: string }[];
};

type NoticeRow = Record<string, unknown> & {
  id: number;
  bid_ntce_nm: string;
  raw_data: string | null;
};

/** raw_data(JSON)에만 있고 컬럼으로는 안 뽑아둔 필드까지 전부 보여준다 */
const FIELD_LABELS: Record<string, string> = {
  bid_ntce_no: '공고번호',
  bid_ntce_ord: '차수',
  ntce_kind_nm: '공고종류',
  re_ntce_yn: '재공고여부',
  rgst_ty_nm: '등록유형',
  ntce_instt_nm: '공고기관',
  dminstt_nm: '수요기관',
  bid_mthd_nm: '입찰방식',
  cntrct_cncls_mthd_nm: '계약체결방법',
  srvce_div_nm: '용역구분',
  bid_ntce_dt: '공고일시',
  bid_begin_dt: '입찰개시',
  bid_close_dt: '입찰마감',
  openg_dt: '개찰일시',
  tech_ablt_evl_rt: '기술능력평가비율',
  bid_prce_evl_rt: '입찰가격평가비율',
  ntce_instt_ofcl_nm: '담당자',
  ntce_instt_ofcl_tel_no: '연락처',
  ntce_instt_ofcl_email: '이메일',
};

function resolveTarget(arg: string): { id?: number; bidNtceNo?: string; from: string } {
  const n = parseInt(arg, 10);
  // 순수 숫자 = 다이제스트 번호. 공고번호는 영문이 섞여 있어 구분된다.
  if (String(n) === arg.trim() && n > 0) {
    if (!fs.existsSync(INDEX_PATH)) {
      throw new Error('최근 다이제스트 목록이 없습니다. 먼저 `npm run digest`를 실행하세요.');
    }
    const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8')) as IndexFile;
    const hit = idx.items.find(it => it.no === n);
    if (!hit) {
      throw new Error(
        `${n}번은 마지막 목록(1~${idx.items.length}번, ${idx.generatedAt} 기준)에 없습니다.`
      );
    }
    return { id: hit.id, from: `마지막 다이제스트 ${n}번 (${idx.generatedAt} 기준)` };
  }
  return { bidNtceNo: arg.trim(), from: `공고번호 ${arg.trim()}` };
}

function main() {
  const arg = process.argv.slice(2).find(a => !a.startsWith('--'));
  if (!arg) {
    console.log('사용법: npm run notice -- <번호|공고번호>');
    process.exitCode = 1;
    return;
  }

  const target = resolveTarget(arg);
  const db = getDb();
  const row = (
    target.id
      ? db.prepare('SELECT * FROM bid_notices WHERE id = ?').get(target.id)
      : db
          .prepare('SELECT * FROM bid_notices WHERE bid_ntce_no = ? ORDER BY bid_ntce_ord DESC LIMIT 1')
          .get(target.bidNtceNo)
  ) as NoticeRow | undefined;

  if (!row) {
    console.log(`해당 공고를 찾을 수 없습니다 (${target.from}).`);
    process.exitCode = 1;
    return;
  }

  const keywords = db
    .prepare(
      `SELECT k.keyword FROM keyword_matches km
         JOIN keywords k ON k.id = km.keyword_id
        WHERE km.bid_notice_id = ?`
    )
    .all(row.id) as { keyword: string }[];

  const out: string[] = [];
  out.push(`### ${row.bid_ntce_nm}`);
  out.push(`(조회 기준: ${target.from})`);
  out.push('');

  const budget = (row.asign_bdgt_amt as number) || (row.presmpt_prce as number) || 0;
  out.push(`- 배정예산/추정가격: ${money(budget)} (raw: ${budget})`);
  if (keywords.length) out.push(`- 매칭 키워드: ${keywords.map(k => k.keyword).join(', ')}`);

  for (const [col, label] of Object.entries(FIELD_LABELS)) {
    const v = row[col];
    if (v === null || v === undefined || v === '') continue;
    const shown = /_dt$/.test(col) ? `${v} (${shortDt(String(v))})` : String(v);
    out.push(`- ${label}: ${shown}`);
  }

  const urls = [
    ['공고 상세', row.bid_ntce_dtl_url],
    ['공고 URL', row.bid_ntce_url],
    ['규격서1', row.ntce_spec_doc_url1],
    ['규격서2', row.ntce_spec_doc_url2],
  ].filter(([, v]) => v) as [string, string][];
  if (urls.length) {
    out.push('');
    out.push('첨부/링크:');
    for (const [label, url] of urls) out.push(`- ${label}: ${url}`);
  }

  const files = [row.ntce_spec_file_nm1, row.ntce_spec_file_nm2].filter(Boolean);
  if (files.length) out.push(`- 첨부파일명: ${files.join(' / ')}`);

  // API가 준 원본 필드 중 위에서 안 다룬 것까지 통째로 넘긴다 — 요약하는 쪽이 판단하도록
  if (row.raw_data) {
    try {
      const raw = JSON.parse(row.raw_data) as Record<string, unknown>;
      const extra = Object.entries(raw).filter(
        ([, v]) => v !== null && v !== '' && v !== undefined
      );
      out.push('');
      out.push('원본 API 필드 전체:');
      out.push('```json');
      out.push(JSON.stringify(Object.fromEntries(extra), null, 1));
      out.push('```');
    } catch {
      /* raw_data 파손 시 무시 */
    }
  }

  console.log(out.join('\n'));
}

try {
  main();
} catch (err) {
  console.log(`조회 실패: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
