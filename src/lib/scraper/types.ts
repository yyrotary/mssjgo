export interface CrawlerConfig {
  startUrl:        string;
  maxDepth:        number;     // 기본값 5
  maxPages:        number;     // 기본값 200 — 팬아웃 폭발 방지 필수
  maxConcurrency:  number;     // 기본값 3 — Puppeteer 동시 페이지 수
  pageTimeout:     number;     // 기본값 15_000ms — 개별 페이지 타임아웃
  requestDelay:    number;     // 기본값 500ms — politeness delay
  headless:        boolean;    // 기본값 false (로컬 전용, headed 모드)
  respectRobots:   boolean;    // 기본값 true
  requireLogin?:   boolean;    // 기본값 false — 크롤링 시작 전 수동 로그인 대기 여부
}

export interface CrawlProgress {
  type:       'page_done' | 'page_error' | 'log' | 'complete' | 'stopped' | 'waiting_login';
  url?:       string;
  depth?:     number;
  totalDone:  number;
  totalQueue: number;
  message:    string;
  timestamp:  number;
}

export interface PageResult {
  url:       string;
  title:     string;
  markdown:  string;
  depth:     number;
  crawledAt: number;
  byteSize:  number;
}

export type JobStatus = 'idle' | 'running' | 'waiting_login' | 'stopping' | 'done' | 'error';

export interface CrawlJob {
  id:        string;
  config:    CrawlerConfig;
  status:    JobStatus;
  results:   Map<string, PageResult>;
  progress:  CrawlProgress[];
  startedAt: number;
}
