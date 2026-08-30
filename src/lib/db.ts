import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isVercelRuntime =
  process.env.VERCEL === '1' || process.cwd().startsWith('/var/task');

const DATA_DIR = isVercelRuntime
  ? path.join('/tmp', 'g2b-monitor', 'data')
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'g2b.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  migrate(db);
  seedInitialData(db);

  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS keyword_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES keyword_groups(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS bid_notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bid_ntce_no TEXT NOT NULL,
      bid_ntce_ord TEXT NOT NULL,
      re_ntce_yn TEXT,
      rgst_ty_nm TEXT,
      ntce_kind_nm TEXT,
      bid_ntce_nm TEXT,
      ntce_instt_cd TEXT,
      ntce_instt_nm TEXT,
      dminstt_cd TEXT,
      dminstt_nm TEXT,
      bid_mthd_nm TEXT,
      cntrct_cncls_mthd_nm TEXT,
      bid_ntce_dt TEXT,
      bid_begin_dt TEXT,
      bid_close_dt TEXT,
      openg_dt TEXT,
      ntce_instt_ofcl_nm TEXT,
      ntce_instt_ofcl_tel_no TEXT,
      ntce_instt_ofcl_email TEXT,
      presmpt_prce REAL,
      asign_bdgt_amt REAL,
      srvce_div_nm TEXT,
      tech_ablt_evl_rt TEXT,
      bid_prce_evl_rt TEXT,
      bid_ntce_dtl_url TEXT,
      bid_ntce_url TEXT,
      ntce_spec_doc_url1 TEXT,
      ntce_spec_doc_url2 TEXT,
      ntce_spec_file_nm1 TEXT,
      ntce_spec_file_nm2 TEXT,
      rgst_dt TEXT,
      collected_at TEXT DEFAULT (datetime('now', 'localtime')),
      raw_data TEXT,
      UNIQUE(bid_ntce_no, bid_ntce_ord)
    );

    CREATE TABLE IF NOT EXISTS keyword_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bid_notice_id INTEGER NOT NULL REFERENCES bid_notices(id) ON DELETE CASCADE,
      keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
      matched_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(bid_notice_id, keyword_id)
    );

    CREATE TABLE IF NOT EXISTS bid_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bid_notice_id INTEGER NOT NULL REFERENCES bid_notices(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'new',
      memo TEXT,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS collection_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT,
      finished_at TEXT,
      api_operation TEXT,
      total_fetched INTEGER DEFAULT 0,
      new_saved INTEGER DEFAULT 0,
      matched INTEGER DEFAULT 0,
      status TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS seed_done (
      id INTEGER PRIMARY KEY
    );
  `);
}

function migrate(db: Database.Database) {
  // Migration 1: is_favorite 컬럼
  try {
    db.exec(`ALTER TABLE bid_notes ADD COLUMN is_favorite INTEGER DEFAULT 0`);
  } catch { /* 이미 존재 */ }

  // Migration 2: 기본 키워드 교체 (seed v2)
  const m2Done = db.prepare('SELECT id FROM seed_done WHERE id = 2').get();
  if (!m2Done) {
    // 기존 그룹/키워드/매칭 전체 초기화 후 새 seed 재실행
    db.prepare('DELETE FROM keyword_groups').run(); // CASCADE → keywords, keyword_matches
    db.prepare('DELETE FROM seed_done').run();      // seedInitialData 재실행 허용
  }
}

function seedInitialData(db: Database.Database) {
  const seedDone = db.prepare('SELECT id FROM seed_done WHERE id = 1').get();
  if (seedDone) return;

  const initialGroups = [
    {
      name: 'AI 교육', priority: 'core', keywords: [
        'AI 교육', '인공지능 교육', 'AX', 'AX 교육', 'AI 특화', 'AI 위탁', 'AI 훈련',
        'AI 프로그램', '디지털 교육', '생성형 교육', '리터러시', 'AI 리터러시', '디지털 리터러시',
        '교원 연수', 'AI 교재', '인공지능 교재', 'AI 교육과정', '인공지능 교육과정',
        'AI 동향', '위탁 교육', '연수', '인정도서',
      ],
    },
    {
      name: '디지털 전환', priority: 'interest', keywords: [
        'AI 활용', '인공지능 활용', '캠프', 'AI 인력', '인공지능 인력', '인공지능 인재', 'AI 인재',
        '부트캠프', '부트 캠프', 'AI 양성', '인공지능 양성', 'AI 조사 용역', 'AI 조사',
        '인공지능 조사', '인력 양성', '행사 운영', '교육', '콘텐츠',
      ],
    },
  ];

  const insertGroup = db.prepare('INSERT INTO keyword_groups (name, priority) VALUES (?, ?)');
  const insertKeyword = db.prepare('INSERT INTO keywords (group_id, keyword) VALUES (?, ?)');

  const seedAll = db.transaction(() => {
    for (const group of initialGroups) {
      const result = insertGroup.run(group.name, group.priority);
      const groupId = result.lastInsertRowid;
      for (const kw of group.keywords) {
        insertKeyword.run(groupId, kw);
      }
    }

    // Insert dummy bid notices for UI demo
    const dummyNotices = [
      {
        bid_ntce_no: 'R25BK00933736', bid_ntce_ord: '000',
        re_ntce_yn: 'N', rgst_ty_nm: '조달청 또는 나라장터 자체 공고건',
        ntce_kind_nm: '등록공고', bid_ntce_nm: 'AI 기반 탄소 데이터 정제 알고리즘 개발 용역',
        ntce_instt_cd: 'B090021', ntce_instt_nm: '한국생산기술연구원',
        dminstt_cd: 'B090021', dminstt_nm: '한국생산기술연구원',
        bid_mthd_nm: '전자입찰', cntrct_cncls_mthd_nm: '제한경쟁',
        bid_ntce_dt: '2025-03-01 09:28:14', bid_begin_dt: '2025-03-02 09:00:00',
        bid_close_dt: '2025-03-10 14:00:00', openg_dt: '2025-03-10 15:00:00',
        ntce_instt_ofcl_nm: '홍길동', ntce_instt_ofcl_tel_no: '02-1234-5678',
        ntce_instt_ofcl_email: 'test@kitech.re.kr',
        presmpt_prce: 129834000, asign_bdgt_amt: 142817400,
        srvce_div_nm: '기술용역', tech_ablt_evl_rt: '80', bid_prce_evl_rt: '20',
        bid_ntce_dtl_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00933736&bidPbancOrd=000',
        bid_ntce_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00933736&bidPbancOrd=000',
        ntce_spec_doc_url1: '', ntce_spec_doc_url2: '',
        ntce_spec_file_nm1: '', ntce_spec_file_nm2: '',
        rgst_dt: '2025-03-01 09:28:14', raw_data: '{}'
      },
      {
        bid_ntce_no: 'R25BK00934017', bid_ntce_ord: '000',
        re_ntce_yn: 'N', rgst_ty_nm: '조달청 또는 나라장터 자체 공고건',
        ntce_kind_nm: '등록공고', bid_ntce_nm: '인공지능교육 플랫폼 구축 및 운영 용역',
        ntce_instt_cd: 'A100001', ntce_instt_nm: '교육부',
        dminstt_cd: 'A100001', dminstt_nm: '교육부',
        bid_mthd_nm: '전자입찰', cntrct_cncls_mthd_nm: '일반경쟁',
        bid_ntce_dt: '2025-03-05 10:00:00', bid_begin_dt: '2025-03-06 09:00:00',
        bid_close_dt: '2025-03-09 18:00:00', openg_dt: '2025-03-10 10:00:00',
        ntce_instt_ofcl_nm: '김철수', ntce_instt_ofcl_tel_no: '02-6222-6060',
        ntce_instt_ofcl_email: 'kcs@moe.go.kr',
        presmpt_prce: 450000000, asign_bdgt_amt: 500000000,
        srvce_div_nm: '일반용역', tech_ablt_evl_rt: '90', bid_prce_evl_rt: '10',
        bid_ntce_dtl_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00934017&bidPbancOrd=000',
        bid_ntce_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00934017&bidPbancOrd=000',
        ntce_spec_doc_url1: '', ntce_spec_doc_url2: '',
        ntce_spec_file_nm1: '', ntce_spec_file_nm2: '',
        rgst_dt: '2025-03-05 10:00:00', raw_data: '{}'
      },
      {
        bid_ntce_no: 'R25BK00935001', bid_ntce_ord: '000',
        re_ntce_yn: 'N', rgst_ty_nm: '조달청 또는 나라장터 자체 공고건',
        ntce_kind_nm: '등록공고', bid_ntce_nm: '디지털리터러시 교육과정 개발 용역',
        ntce_instt_cd: 'B200030', ntce_instt_nm: '한국교육학술정보원',
        dminstt_cd: 'B200030', dminstt_nm: '한국교육학술정보원',
        bid_mthd_nm: '전자입찰', cntrct_cncls_mthd_nm: '제한경쟁',
        bid_ntce_dt: '2025-03-06 11:00:00', bid_begin_dt: '2025-03-07 09:00:00',
        bid_close_dt: '2025-03-20 17:00:00', openg_dt: '2025-03-21 10:00:00',
        ntce_instt_ofcl_nm: '이영희', ntce_instt_ofcl_tel_no: '053-714-0114',
        ntce_instt_ofcl_email: 'lyh@keris.or.kr',
        presmpt_prce: 85000000, asign_bdgt_amt: 90000000,
        srvce_div_nm: '일반용역', tech_ablt_evl_rt: '75', bid_prce_evl_rt: '25',
        bid_ntce_dtl_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00935001&bidPbancOrd=000',
        bid_ntce_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00935001&bidPbancOrd=000',
        ntce_spec_doc_url1: '', ntce_spec_doc_url2: '',
        ntce_spec_file_nm1: '', ntce_spec_file_nm2: '',
        rgst_dt: '2025-03-06 11:00:00', raw_data: '{}'
      },
      {
        bid_ntce_no: 'R25BK00936100', bid_ntce_ord: '000',
        re_ntce_yn: 'N', rgst_ty_nm: '조달청 또는 나라장터 자체 공고건',
        ntce_kind_nm: '등록공고', bid_ntce_nm: '2025년 스마트시티 디지털혁신 컨설팅 용역',
        ntce_instt_cd: 'C300010', ntce_instt_nm: '국토교통부',
        dminstt_cd: 'C300010', dminstt_nm: '국토교통부',
        bid_mthd_nm: '전자입찰', cntrct_cncls_mthd_nm: '일반경쟁',
        bid_ntce_dt: '2025-03-07 09:00:00', bid_begin_dt: '2025-03-08 09:00:00',
        bid_close_dt: '2025-03-25 18:00:00', openg_dt: '2025-03-26 10:00:00',
        ntce_instt_ofcl_nm: '박민준', ntce_instt_ofcl_tel_no: '044-201-3456',
        ntce_instt_ofcl_email: 'pmj@molit.go.kr',
        presmpt_prce: 320000000, asign_bdgt_amt: 350000000,
        srvce_div_nm: '기술용역', tech_ablt_evl_rt: '85', bid_prce_evl_rt: '15',
        bid_ntce_dtl_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00936100&bidPbancOrd=000',
        bid_ntce_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00936100&bidPbancOrd=000',
        ntce_spec_doc_url1: '', ntce_spec_doc_url2: '',
        ntce_spec_file_nm1: '', ntce_spec_file_nm2: '',
        rgst_dt: '2025-03-07 09:00:00', raw_data: '{}'
      },
      {
        bid_ntce_no: 'R25BK00937200', bid_ntce_ord: '000',
        re_ntce_yn: 'N', rgst_ty_nm: '조달청 또는 나라장터 자체 공고건',
        ntce_kind_nm: '등록공고', bid_ntce_nm: '정책분석 및 연구사업 컨설팅 용역',
        ntce_instt_cd: 'A200005', ntce_instt_nm: '기획재정부',
        dminstt_cd: 'A200005', dminstt_nm: '기획재정부',
        bid_mthd_nm: '전자입찰', cntrct_cncls_mthd_nm: '제한경쟁',
        bid_ntce_dt: '2025-03-08 08:30:00', bid_begin_dt: '2025-03-09 09:00:00',
        bid_close_dt: '2025-03-15 17:00:00', openg_dt: '2025-03-16 10:00:00',
        ntce_instt_ofcl_nm: '최지현', ntce_instt_ofcl_tel_no: '044-215-2000',
        ntce_instt_ofcl_email: 'cjh@moef.go.kr',
        presmpt_prce: 75000000, asign_bdgt_amt: 82000000,
        srvce_div_nm: '일반용역', tech_ablt_evl_rt: '70', bid_prce_evl_rt: '30',
        bid_ntce_dtl_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00937200&bidPbancOrd=000',
        bid_ntce_url: 'https://www.g2b.go.kr/link/PNPE027_01/single/?bidPbancNo=R25BK00937200&bidPbancOrd=000',
        ntce_spec_doc_url1: '', ntce_spec_doc_url2: '',
        ntce_spec_file_nm1: '', ntce_spec_file_nm2: '',
        rgst_dt: '2025-03-08 08:30:00', raw_data: '{}'
      },
    ];

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

    for (const notice of dummyNotices) {
      insertNotice.run(notice);
    }

    // Match keywords to notices
    const allKeywords = db.prepare('SELECT * FROM keywords').all() as { id: number; keyword: string }[];
    const allNotices = db.prepare('SELECT id, bid_ntce_nm FROM bid_notices').all() as { id: number; bid_ntce_nm: string }[];

    const insertMatch = db.prepare(`
      INSERT OR IGNORE INTO keyword_matches (bid_notice_id, keyword_id) VALUES (?, ?)
    `);

    for (const notice of allNotices) {
      for (const kw of allKeywords) {
        const terms = kw.keyword.split(/\s+/).filter(Boolean);
        if (terms.every(term => notice.bid_ntce_nm.includes(term))) {
          insertMatch.run(notice.id, kw.id);
        }
      }
    }

    // Add dummy collection log
    db.prepare(`
      INSERT INTO collection_logs (started_at, finished_at, api_operation, total_fetched, new_saved, matched, status)
      VALUES (datetime('now', 'localtime', '-5 minutes'), datetime('now', 'localtime'), 'getBidPblancListInfoServc', 47, 5, 5, 'success')
    `).run();

    db.prepare('INSERT OR IGNORE INTO seed_done (id) VALUES (1)').run();
    db.prepare('INSERT OR IGNORE INTO seed_done (id) VALUES (2)').run();
  });

  seedAll();
}
