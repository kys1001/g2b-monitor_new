/**
 * 하루 1회 수집 + 디스코드 전송용 다이제스트 생성 스크립트.
 *
 * OpenClaw cron이 이 스크립트를 실행하고, stdout 전체를 디스코드로 announce 한다.
 * 앱 서버(next dev)가 떠 있지 않아도 동작하도록 collector를 직접 호출한다.
 *
 * 출력한 목록은 data/last-digest.json 에 번호↔공고 매핑으로 남긴다.
 * 사용자가 디스코드에서 번호로 답하면 scripts/notice-detail.ts 가 그 파일을 읽어
 * 해당 공고 상세를 뽑는다. 일일 크론(isolated 세션)과 답장 처리 세션이 서로
 * 다르기 때문에, 매핑은 반드시 파일로 넘겨야 한다.
 *
 *   npm run digest                          # 오늘 등록분 수집
 *   npm run digest -- --days 3              # 최근 3일치까지 넓혀서 수집(누락 복구용)
 *   npm run digest -- --since "2026-08-01"  # 수집 없이 해당 시점 이후분 다시 뽑기(재전송/점검용)
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/db';
import { collectBidNotices } from '@/lib/collector';
import { money, pad, shortDt } from './lib/format';

const MAX_LISTED = 10;
const DISCORD_LIMIT = 1900; // 2000자 제한에 여유
const INDEX_PATH = path.join(process.cwd(), 'data', 'last-digest.json');

type DigestRow = {
  id: number;
  bid_ntce_no: string;
  bid_ntce_ord: string;
  bid_ntce_nm: string;
  ntce_instt_nm: string;
  dminstt_nm: string;
  cntrct_cncls_mthd_nm: string;
  bid_close_dt: string;
  asign_bdgt_amt: number;
  presmpt_prce: number;
  bid_ntce_dtl_url: string;
  keywords: string;
};

/** SQLite datetime('now','localtime') 과 같은 포맷 */
function sqliteLocalNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDatetime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** 최근 N일 범위(오늘 포함). days=1 이면 오늘 00:00~23:59 */
function rangeForDays(days: number): { begin: string; end: string } {
  const begin = new Date();
  begin.setDate(begin.getDate() - (days - 1));
  begin.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 0, 0);
  return { begin: fmtDatetime(begin), end: fmtDatetime(end) };
}

function parseDays(argv: string[]): number {
  const i = argv.indexOf('--days');
  if (i === -1) return 1;
  const n = parseInt(argv[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** --since <datetime>: 수집을 건너뛰고 해당 시점 이후 수집분만 다시 렌더링 */
function parseSince(argv: string[]): string | null {
  const i = argv.indexOf('--since');
  return i === -1 ? null : (argv[i + 1] ?? null);
}

async function main() {
  const argv = process.argv.slice(2);
  const since = parseSince(argv);
  let runStart = since ?? sqliteLocalNow();
  let result: Awaited<ReturnType<typeof collectBidNotices>> = { totalFetched: 0, newSaved: 0, matched: 0 };

  if (!since) {
    runStart = sqliteLocalNow();
    result = await collectBidNotices(rangeForDays(parseDays(argv)));

    if (result.error) {
      // 실패는 조용히 넘기지 않는다 — 디스코드로 그대로 보이게 하고 exit 1
      console.log(`🚨 **나라장터 수집 실패**\n\`\`\`\n${result.error}\n\`\`\``);
      process.exitCode = 1;
      return;
    }
  }

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT n.id, n.bid_ntce_no, n.bid_ntce_ord, n.bid_ntce_nm,
              n.ntce_instt_nm, n.dminstt_nm, n.cntrct_cncls_mthd_nm,
              n.bid_close_dt, n.asign_bdgt_amt, n.presmpt_prce, n.bid_ntce_dtl_url,
              GROUP_CONCAT(DISTINCT k.keyword) AS keywords
         FROM bid_notices n
         JOIN keyword_matches km ON km.bid_notice_id = n.id
         JOIN keywords k ON k.id = km.keyword_id
        WHERE n.collected_at >= ?
        GROUP BY n.id
        ORDER BY COALESCE(NULLIF(n.asign_bdgt_amt, 0), n.presmpt_prce) DESC,
                 n.bid_ntce_dt DESC`
    )
    .all(runStart) as DigestRow[];

  const today = new Date();
  const header = `📢 **나라장터 신규 매칭 공고** (${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())})`;

  if (rows.length === 0) {
    fs.writeFileSync(INDEX_PATH, JSON.stringify({ generatedAt: runStart, items: [] }, null, 2));
    console.log(
      `${header}\n신규 매칭 공고 없음 · 조회 ${result.totalFetched}건 / 신규 저장 ${result.newSaved}건`
    );
    return;
  }

  const stats = since
    ? `**매칭 ${rows.length}건** (${since} 이후 수집분 · 재출력)`
    : `조회 ${result.totalFetched}건 · 신규 저장 ${result.newSaved}건 · **매칭 ${rows.length}건**`;

  // 공고 하나를 블록 단위로 만든다 — 잘라낼 때 URL 중간에서 끊기지 않도록
  const blocks = rows.map((row, i) => {
    const n = i + 1;
    const budget = money(row.asign_bdgt_amt || row.presmpt_prce);
    const org = row.ntce_instt_nm || row.dminstt_nm || '발주처 미상';
    const detail = [row.cntrct_cncls_mthd_nm, shortDt(row.bid_close_dt) && `마감 ${shortDt(row.bid_close_dt)}`]
      .filter(Boolean)
      .join(' · ');
    const title = row.bid_ntce_dtl_url
      ? `[${row.bid_ntce_nm}](${row.bid_ntce_dtl_url})`
      : row.bid_ntce_nm;
    const b = [`**${n}.** ${title}`, `　💰 ${budget} ｜ 🏛 ${org}`];
    if (detail) b.push(`　📋 ${detail}`);
    if (row.keywords) b.push(`　🔖 ${row.keywords.split(',').join(', ')}`);
    return b.join('\n');
  });

  const head = `${header}\n${stats}\n`;
  const hint = (omitted: number) =>
    `\n${omitted > 0 ? `…외 ${omitted}건\n` : ''}💬 번호를 입력하면 해당 공고를 상세히 분석해 드립니다.`;

  const shown: string[] = [];
  let used = head.length;
  for (const block of blocks.slice(0, MAX_LISTED)) {
    // 남는 자리는 최악의 경우 안내문까지 담을 수 있어야 한다
    const reserve = hint(rows.length - shown.length).length;
    if (used + block.length + 2 + reserve > DISCORD_LIMIT) break;
    shown.push(block);
    used += block.length + 2;
  }

  // 번호↔공고 매핑을 남긴다. 실제로 출력한 만큼만 — 안 보여준 번호를 물어보면 안 되므로.
  fs.writeFileSync(
    INDEX_PATH,
    JSON.stringify(
      {
        generatedAt: runStart,
        totalMatched: rows.length,
        items: rows.slice(0, shown.length).map((r, i) => ({
          no: i + 1,
          id: r.id,
          bidNtceNo: r.bid_ntce_no,
          bidNtceOrd: r.bid_ntce_ord,
          name: r.bid_ntce_nm,
        })),
      },
      null,
      2
    )
  );

  console.log(head + shown.join('\n\n') + hint(rows.length - shown.length));
}

main().catch(err => {
  console.log(`🚨 **나라장터 수집 스크립트 오류**\n\`\`\`\n${err?.message || String(err)}\n\`\`\``);
  process.exitCode = 1;
});
