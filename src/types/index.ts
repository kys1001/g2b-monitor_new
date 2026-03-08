export interface KeywordGroup {
  id: number;
  name: string;
  priority: 'core' | 'interest' | 'normal';
  is_active: number;
  created_at: string;
  keywords?: Keyword[];
}

export interface Keyword {
  id: number;
  group_id: number;
  keyword: string;
  is_active: number;
  created_at: string;
  group_name?: string;
}

export interface BidNotice {
  id: number;
  bid_ntce_no: string;
  bid_ntce_ord: string;
  re_ntce_yn: string;
  rgst_ty_nm: string;
  ntce_kind_nm: string;
  bid_ntce_nm: string;
  ntce_instt_cd: string;
  ntce_instt_nm: string;
  dminstt_cd: string;
  dminstt_nm: string;
  bid_mthd_nm: string;
  cntrct_cncls_mthd_nm: string;
  bid_ntce_dt: string;
  bid_begin_dt: string;
  bid_close_dt: string;
  openg_dt: string;
  ntce_instt_ofcl_nm: string;
  ntce_instt_ofcl_tel_no: string;
  ntce_instt_ofcl_email: string;
  presmpt_prce: number;
  asign_bdgt_amt: number;
  srvce_div_nm: string;
  tech_ablt_evl_rt: string;
  bid_prce_evl_rt: string;
  bid_ntce_dtl_url: string;
  bid_ntce_url: string;
  ntce_spec_doc_url1: string;
  ntce_spec_doc_url2: string;
  ntce_spec_file_nm1: string;
  ntce_spec_file_nm2: string;
  rgst_dt: string;
  collected_at: string;
  raw_data: string;
  // Joined fields
  matched_keywords?: string;
  status?: string;
  memo?: string;
  note_id?: number;
  is_favorite?: number;
}

export interface KeywordMatch {
  id: number;
  bid_notice_id: number;
  keyword_id: number;
  matched_at: string;
}

export interface BidNote {
  id: number;
  bid_notice_id: number;
  status: 'new' | 'interest' | 'reviewing' | 'preparing' | 'pass';
  memo: string;
  updated_at: string;
}

export interface CollectionLog {
  id: number;
  started_at: string;
  finished_at: string;
  api_operation: string;
  total_fetched: number;
  new_saved: number;
  matched: number;
  status: 'success' | 'error';
  error_message: string;
}

export interface G2BApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: G2BItem[] | G2BItem | '';
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export interface G2BItem {
  bidNtceNo: string;
  bidNtceOrd: string;
  reNtceYn: string;
  rgstTyNm: string;
  ntceKindNm: string;
  intrbidYn: string;
  bidNtceDt: string;
  refNo: string;
  bidNtceNm: string;
  ntceInsttCd: string;
  ntceInsttNm: string;
  dminsttCd: string;
  dminsttNm: string;
  bidMethdNm: string;
  cntrctCnclsMthdNm: string;
  bidBeginDt: string;
  bidClseDt: string;
  opengDt: string;
  ntceInsttOfclNm: string;
  ntceInsttOfclTelNo: string;
  ntceInsttOfclEmail: string;
  ntceSpecDocUrl1: string;
  ntceSpecDocUrl2: string;
  ntceSpecFileNm1: string;
  ntceSpecFileNm2: string;
  bidNtceDtlUrl: string;
  bidNtceUrl: string;
  asignBdgtAmt: string;
  presmptPrce: string;
  srvceDivNm: string;
  techAbltEvlRt: string;
  bidPrceEvlRt: string;
  reNtceOrd: string;
  rgstDt: string;
}

export interface DashboardStats {
  todayMatched: number;
  urgentCount: number;
  lastCollected: string | null;
  keywordStats: { keyword: string; count: number }[];
}

export interface NoticeFilter {
  groupId?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  priceFrom?: number;
  priceTo?: number;
  institution?: string;
  srvceDivNm?: string;
  sortBy?: 'bid_ntce_dt' | 'bid_close_dt' | 'presmpt_prce';
  sortOrder?: 'asc' | 'desc';
  status?: string;
}
