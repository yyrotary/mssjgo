# Next.js 로컬 웹 스크래퍼 — 최종 설계안 (v2.0)

> **대상 환경**: 로컬 데스크톱 전용 (배포 없음)
> **기술 스택**: Next.js 14+ (App Router) / TypeScript / Puppeteer / Turndown
> **작성일**: 2026-03-13

---

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App (localhost:3000)                               │
│                                                             │
│  ┌──────────────────────┐    SSE (EventSource)              │
│  │  /scraper  (Client)  │◄────────────────────────┐         │
│  │  - URL 입력 폼       │                         │         │
│  │  - 실시간 로그 뷰어  │    POST (start/stop)    │         │
│  │  - 진행률 표시       │────────────────────┐    │         │
│  │  - 다운로드 버튼     │                    ▼    │         │
│  └──────────────────────┘    ┌────────────────────────┐     │
│                              │  API Routes            │     │
│                              │  /api/scraper/start    │     │
│                              │  /api/scraper/stream   │──┐  │
│                              │  /api/scraper/stop     │  │  │
│                              │  /api/scraper/download │  │  │
│                              └────────────────────────┘  │  │
│                                                          │  │
│  ┌───────────────────────────────────────────────────────┐│  │
│  │  Scraper Engine (src/lib/scraper/)                    ││  │
│  │                                                       ││  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ││  │
│  │  │ CrawlManager │  │ PageProcessor│  │ ResultStore  │ ││  │
│  │  │ - BFS Queue  │  │ - Puppeteer  │  │ - Map<url,  │ ││  │
│  │  │ - Visited Set│  │ - DOM 정제   │  │    markdown> │ ││  │
│  │  │ - Concurrency│  │ - Turndown   │  │ - 메타데이터 │ ││  │
│  │  │ - Depth/Page │  │ - Link추출   │  │              │ ││  │
│  │  │   Limiter    │  │              │  │              │ ││  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘ ││  │
│  │         │                 │                            ││  │
│  │  ┌──────┴─────────────────┴──────┐                    ││  │
│  │  │ InputValidator                │                    ││  │
│  │  │ - URL 검증                    │                    ││  │
│  │  │ - Private IP 차단 (SSRF 방어) │                    ││  │
│  │  │ - robots.txt 캐시 & 준수      │                    ││  │
│  │  └───────────────────────────────┘                    ││  │
│  └───────────────────────────────────────────────────────┘│  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 의존성 설치

```bash
# 브라우저 자동화
npm install puppeteer

# HTML → Markdown 변환 (GFM 지원 포함)
npm install turndown turndown-plugin-gfm

# robots.txt 파싱
npm install robots-parser

# 타입 정의
npm install -D @types/turndown
```

> **Note**: `file-saver` 제거 — 서버 측 스트림 다운로드로 대체하여 대용량 안정성 확보.

---

## 3. 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx                    # Header에 /scraper 링크 추가
│   ├── scraper/
│   │   └── page.tsx                  # 스크래퍼 프론트엔드 (Client Component)
│   └── api/
│       └── scraper/
│           ├── start/route.ts        # POST - 크롤링 Job 시작
│           ├── stream/route.ts       # GET  - SSE 실시간 진행 스트림
│           ├── stop/route.ts         # POST - 크롤링 중단
│           └── download/route.ts     # GET  - Markdown 파일 스트림 다운로드
├── lib/
│   └── scraper/
│       ├── types.ts                  # 공통 타입/인터페이스 정의
│       ├── CrawlManager.ts           # 큐, 동시성, depth/page 제한
│       ├── PageProcessor.ts          # Puppeteer + DOM 정제 + Turndown
│       ├── InputValidator.ts         # URL 검증 + SSRF 방어 + robots.txt
│       ├── ResultStore.ts            # 인메모리 결과 저장소
│       └── SessionManager.ts         # 브라우저 세션 + Job 생명주기 관리
```

---

## 4. 핵심 타입 정의 (`src/lib/scraper/types.ts`)

```typescript
export interface CrawlerConfig {
  startUrl:        string;
  maxDepth:        number;     // 기본값 5
  maxPages:        number;     // 기본값 200 — 팬아웃 폭발 방지 필수
  maxConcurrency:  number;     // 기본값 3 — Puppeteer 동시 페이지 수
  pageTimeout:     number;     // 기본값 15_000ms — 개별 페이지 타임아웃
  requestDelay:    number;     // 기본값 500ms — politeness delay
  headless:        boolean;    // 기본값 false (로컬 전용, headed 모드)
  respectRobots:   boolean;    // 기본값 true
}

export interface CrawlProgress {
  type:       'page_done' | 'page_error' | 'log' | 'complete' | 'stopped';
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

export type JobStatus = 'idle' | 'running' | 'stopping' | 'done' | 'error';

export interface CrawlJob {
  id:        string;
  config:    CrawlerConfig;
  status:    JobStatus;
  results:   Map<string, PageResult>;
  progress:  CrawlProgress[];
  startedAt: number;
}
```

---

## 5. 백엔드 모듈 상세

### 5-1. InputValidator (`src/lib/scraper/InputValidator.ts`)

```typescript
import robotsParser from 'robots-parser';

export class InputValidator {
  private robotsCache = new Map<string, ReturnType<typeof robotsParser>>();

  /** URL 형식 검증 + SSRF 방어 */
  validateUrl(raw: string): { valid: boolean; url?: URL; error?: string } {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return { valid: false, error: '유효하지 않은 URL 형식' };
    }

    // 프로토콜 제한
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'http/https 프로토콜만 허용' };
    }

    // SSRF 방어: Private IP 대역 차단
    const hostname = parsed.hostname;
    const blocked = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^localhost$/i,
      /^.*\.local$/i,
      /^169\.254\./,               // link-local
      /^metadata\.google\.internal$/i,
    ];
    if (blocked.some(r => r.test(hostname))) {
      return { valid: false, error: '내부 네트워크 주소 접근 차단됨' };
    }

    return { valid: true, url: parsed };
  }

  /** robots.txt 확인 (캐시 적용) */
  async isAllowed(url: string, origin: string): Promise<boolean> {
    try {
      if (!this.robotsCache.has(origin)) {
        const res = await fetch(`${origin}/robots.txt`, {
          signal: AbortSignal.timeout(5000)
        });
        const text = res.ok ? await res.text() : '';
        this.robotsCache.set(origin, robotsParser(`${origin}/robots.txt`, text));
      }
      return this.robotsCache.get(origin)!.isAllowed(url, 'ScraperBot') ?? true;
    } catch {
      return true; // robots.txt 접근 불가 시 허용 (관례)
    }
  }
}
```

### 5-2. PageProcessor (`src/lib/scraper/PageProcessor.ts`)

```typescript
import type { Page } from 'puppeteer';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export class PageProcessor {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle:   'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    this.turndown.use(gfm);           // GFM 테이블, strikethrough 지원

    // 불필요 요소 제거 규칙
    this.turndown.remove([
      'script', 'style', 'noscript', 'iframe',
      'nav', 'footer', 'header', 'aside',
      'svg', 'canvas', 'form', 'button',
    ]);
  }

  /** 페이지 본문 추출 + Markdown 변환 */
  async process(page: Page): Promise<{ title: string; markdown: string; links: string[] }> {

    const { title, html, links } = await page.evaluate(() => {
      // 본문 감지: <article> → <main> → <body> 순 우선
      const body =
        document.querySelector('article') ??
        document.querySelector('main') ??
        document.body;

      // 링크 수집 (절대 URL로 정규화)
      const anchors = Array.from(body.querySelectorAll('a[href]'));
      const links = anchors
        .map(a => {
          try { return new URL(a.getAttribute('href')!, location.href).href; }
          catch { return null; }
        })
        .filter((u): u is string => u !== null);

      return {
        title: document.title || '',
        html:  body.innerHTML,
        links: [...new Set(links)],
      };
    });

    // 해시/쿼리 제거, 중복 방지 정규화
    const cleanLinks = links.map(l => {
      try {
        const u = new URL(l);
        u.hash = '';
        return u.href;
      } catch { return null; }
    }).filter((u): u is string => u !== null);

    const markdown = this.turndown.turndown(html);

    return { title, markdown, links: [...new Set(cleanLinks)] };
  }
}
```

### 5-3. CrawlManager (`src/lib/scraper/CrawlManager.ts`)

```typescript
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { type CrawlerConfig, type CrawlProgress, type PageResult } from './types';
import { PageProcessor } from './PageProcessor';
import { InputValidator } from './InputValidator';

export class CrawlManager {
  private config: CrawlerConfig;
  private browser: Browser | null = null;
  private visited   = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private results   = new Map<string, PageResult>();
  private processor = new PageProcessor();
  private validator = new InputValidator();
  private aborted   = false;
  private activePages = 0;
  private originHostname = '';
  private originUrl = '';

  // 외부에서 구독하는 진행 콜백
  public onProgress: (p: CrawlProgress) => void = () => {};

  constructor(config: CrawlerConfig) {
    this.config = {
      maxDepth:       5,
      maxPages:       200,
      maxConcurrency: 3,
      pageTimeout:    15_000,
      requestDelay:   500,
      headless:       false,
      respectRobots:  true,
      ...config,
    };
  }

  /** 브라우저 인스턴스 시작 (headed 모드) */
  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
      ],
    });
    this.emit('log', '브라우저가 준비되었습니다.');
  }

  /** 크롤링 실행 — BFS + Concurrency Limiter */
  async crawl(): Promise<Map<string, PageResult>> {
    if (!this.browser) throw new Error('브라우저가 아직 시작되지 않았습니다.');

    const { valid, url, error } = this.validator.validateUrl(this.config.startUrl);
    if (!valid || !url) throw new Error(error);

    this.originHostname = url.hostname;
    this.originUrl = url.origin;
    this.queue.push({ url: url.href, depth: 0 });
    this.emit('log', `크롤링 시작: ${url.href} (최대 깊이=${this.config.maxDepth}, 최대 페이지=${this.config.maxPages})`);

    // BFS 루프 — 동시성 제어
    while (this.queue.length > 0 && !this.aborted) {
      if (this.visited.size >= this.config.maxPages) {
        this.emit('log', `최대 페이지 수(${this.config.maxPages})에 도달. 크롤링 종료.`);
        break;
      }
      if (this.activePages >= this.config.maxConcurrency) {
        await this.sleep(100);
        continue;
      }

      const item = this.queue.shift();
      if (!item || this.visited.has(item.url)) continue;
      if (item.depth > this.config.maxDepth) continue;

      this.visited.add(item.url);
      this.activePages++;

      // 개별 페이지 처리 — fire & forget (에러 격리)
      this.processPage(item.url, item.depth)
        .catch(err => {
          this.emit('page_error', `[ERROR] ${item.url}: ${(err as Error).message}`, item.url, item.depth);
        })
        .finally(() => { this.activePages--; });

      await this.sleep(this.config.requestDelay);
    }

    // 잔여 작업 완료 대기
    while (this.activePages > 0) await this.sleep(200);

    this.emit('complete', `크롤링 완료. 총 ${this.results.size}개 페이지 수집.`);
    return this.results;
  }

  /** 개별 페이지 처리 (에러 격리됨) */
  private async processPage(url: string, depth: number): Promise<void> {
    // robots.txt 검사
    if (this.config.respectRobots) {
      const allowed = await this.validator.isAllowed(url, this.originUrl);
      if (!allowed) {
        this.emit('log', `[SKIP] robots.txt 차단: ${url}`);
        return;
      }
    }

    const page: Page = await this.browser!.newPage();
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout:   this.config.pageTimeout,
      });

      const { title, markdown, links } = await this.processor.process(page);

      this.results.set(url, {
        url, title, markdown, depth,
        crawledAt: Date.now(),
        byteSize:  new TextEncoder().encode(markdown).length,
      });

      this.emit('page_done', `[${this.results.size}/${this.config.maxPages}] (d=${depth}) ${title || url}`, url, depth);

      // 동일 도메인 링크만 큐에 추가
      if (depth < this.config.maxDepth) {
        for (const link of links) {
          try {
            const linkUrl = new URL(link);
            if (
              linkUrl.hostname === this.originHostname &&
              !this.visited.has(link) &&
              !this.queue.some(q => q.url === link)
            ) {
              this.queue.push({ url: link, depth: depth + 1 });
            }
          } catch { /* 무효 URL 무시 */ }
        }
      }
    } finally {
      await page.close();
    }
  }

  /** 크롤링 중단 */
  stop(): void {
    this.aborted = true;
    this.emit('stopped', '사용자에 의해 크롤링이 중단되었습니다.');
  }

  /** 브라우저 종료 */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getResults(): Map<string, PageResult> {
    return this.results;
  }

  // ── 내부 유틸 ──

  private emit(
    type: CrawlProgress['type'],
    message: string,
    url?: string,
    depth?: number
  ): void {
    this.onProgress({
      type, url, depth, message,
      totalDone:  this.results.size,
      totalQueue: this.queue.length,
      timestamp:  Date.now(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
```

### 5-4. SessionManager (`src/lib/scraper/SessionManager.ts`)

```typescript
import { CrawlManager } from './CrawlManager';
import { type CrawlerConfig, type CrawlProgress, type CrawlJob } from './types';
import { randomUUID } from 'crypto';

/**
 * 로컬 전용이므로 단일 세션만 유지.
 * 서버 프로세스 메모리에 상태를 보관하며,
 * SSE 연결을 통해 프론트엔드로 실시간 전달.
 */
class SessionManager {
  private currentJob: CrawlJob | null = null;
  private manager: CrawlManager | null = null;
  private listeners: Set<(p: CrawlProgress) => void> = new Set();

  async start(config: CrawlerConfig): Promise<string> {
    if (this.currentJob?.status === 'running') {
      throw new Error('이미 실행 중인 크롤링이 있습니다.');
    }

    const jobId = randomUUID();
    this.currentJob = {
      id: jobId,
      config,
      status:    'running',
      results:   new Map(),
      progress:  [],
      startedAt: Date.now(),
    };

    this.manager = new CrawlManager(config);

    // 진행 이벤트 → SSE 리스너 + Job 기록
    this.manager.onProgress = (p) => {
      this.currentJob?.progress.push(p);
      this.listeners.forEach(fn => fn(p));
    };

    // 비동기 실행 (await 안 함 — 즉시 jobId 반환)
    (async () => {
      try {
        await this.manager!.launch();
        const results = await this.manager!.crawl();
        this.currentJob!.results = results;
        this.currentJob!.status = 'done';
      } catch (err) {
        this.currentJob!.status = 'error';
        const msg = (err as Error).message;
        this.listeners.forEach(fn =>
          fn({ type: 'complete', totalDone: 0, totalQueue: 0, message: `오류: ${msg}`, timestamp: Date.now() })
        );
      } finally {
        await this.manager?.close();
      }
    })();

    return jobId;
  }

  stop(): void {
    if (this.manager && this.currentJob?.status === 'running') {
      this.currentJob.status = 'stopping';
      this.manager.stop();
    }
  }

  subscribe(fn: (p: CrawlProgress) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getJob(): CrawlJob | null {
    return this.currentJob;
  }
}

// 싱글턴 (로컬 단일 사용자 전제)
export const session = new SessionManager();
```

---

## 6. API 엔드포인트

### 6-1. POST `/api/scraper/start` — 크롤링 시작

```typescript
// src/app/api/scraper/start/route.ts
import { NextResponse } from 'next/server';
import { session } from '@/lib/scraper/SessionManager';
import type { CrawlerConfig } from '@/lib/scraper/types';

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<CrawlerConfig>;

    if (!body.startUrl) {
      return NextResponse.json({ error: 'startUrl은 필수입니다.' }, { status: 400 });
    }

    const jobId = await session.start({
      startUrl:       body.startUrl,
      maxDepth:       body.maxDepth       ?? 5,
      maxPages:       body.maxPages       ?? 200,
      maxConcurrency: body.maxConcurrency ?? 3,
      pageTimeout:    body.pageTimeout    ?? 15_000,
      requestDelay:   body.requestDelay   ?? 500,
      headless:       body.headless       ?? false,
      respectRobots:  body.respectRobots  ?? true,
    });

    return NextResponse.json({ jobId, status: 'started' });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 409 }   // Conflict: 이미 실행 중
    );
  }
}
```

### 6-2. GET `/api/scraper/stream` — SSE 실시간 스트림

```typescript
// src/app/api/scraper/stream/route.ts
import { session } from '@/lib/scraper/SessionManager';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // 기존 진행 기록 재전송 (재연결 대비)
      const job = session.getJob();
      if (job) {
        job.progress.forEach(p => send(p));
      }

      // 실시간 구독
      const unsub = session.subscribe(p => {
        send(p);
        if (p.type === 'complete' || p.type === 'stopped') {
          controller.close();
        }
      });

      // 연결 종료 시 정리
      // (ReadableStream cancel 시 호출)
    },
    cancel() {
      // cleanup if needed
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
```

### 6-3. POST `/api/scraper/stop` — 크롤링 중단

```typescript
// src/app/api/scraper/stop/route.ts
import { NextResponse } from 'next/server';
import { session } from '@/lib/scraper/SessionManager';

export async function POST() {
  session.stop();
  return NextResponse.json({ status: 'stopping' });
}
```

### 6-4. GET `/api/scraper/download` — Markdown 스트림 다운로드

```typescript
// src/app/api/scraper/download/route.ts
import { session } from '@/lib/scraper/SessionManager';

export async function GET() {
  const job = session.getJob();
  if (!job || job.results.size === 0) {
    return new Response('수집된 결과가 없습니다.', { status: 404 });
  }

  const encoder = new TextEncoder();

  // 서버 측 스트림 — 클라이언트 메모리 부담 제거
  const stream = new ReadableStream({
    start(controller) {
      const sorted = [...job.results.values()].sort((a, b) => a.depth - b.depth);

      // 목차 생성
      let toc = '# 크롤링 결과\n\n';
      toc += `- **시작 URL**: ${job.config.startUrl}\n`;
      toc += `- **수집 페이지**: ${sorted.length}개\n`;
      toc += `- **수집 시각**: ${new Date(job.startedAt).toLocaleString('ko-KR')}\n\n`;
      toc += '## 목차\n\n';
      sorted.forEach((r, i) => {
        toc += `${i + 1}. [${r.title || r.url}](#page-${i + 1}) (depth: ${r.depth})\n`;
      });
      toc += '\n---\n\n';
      controller.enqueue(encoder.encode(toc));

      // 각 페이지 본문
      sorted.forEach((r, i) => {
        let section = `<a id="page-${i + 1}"></a>\n\n`;
        section += `## ${r.title || '(제목 없음)'}\n\n`;
        section += `> **URL**: ${r.url}  \n`;
        section += `> **Depth**: ${r.depth}\n\n`;
        section += r.markdown;
        section += '\n\n---\n\n';
        controller.enqueue(encoder.encode(section));
      });

      controller.close();
    }
  });

  const filename = encodeURIComponent(
    `scrape_${new URL(job.config.startUrl).hostname}_${Date.now()}.md`
  );

  return new Response(stream, {
    headers: {
      'Content-Type':        'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

---

## 7. 프론트엔드 (`src/app/scraper/page.tsx`)

### 7-1. UI 구성 요소

| 영역 | 설명 |
|------|------|
| **URL 입력 폼** | 타겟 URL + 고급 옵션 (depth, maxPages, concurrency, delay) 토글 |
| **제어 버튼** | [크롤링 시작] / [중단] / [다운로드] — 상태에 따라 활성/비활성 |
| **실시간 로그** | SSE 수신 로그를 역순 표시, auto-scroll, 색상 구분 (성공/에러/정보) |
| **진행률 바** | `totalDone / maxPages` 기반 퍼센트 표시 |
| **결과 요약** | 수집 완료 후 총 페이지 수, 소요 시간, 총 용량 표시 |

### 7-2. 클라이언트 핵심 로직 (요약)

```typescript
'use client';

import { useState, useRef, useCallback } from 'react';
import type { CrawlProgress } from '@/lib/scraper/types';

export default function ScraperPage() {
  const [url, setUrl]           = useState('');
  const [status, setStatus]     = useState<'idle'|'running'|'done'>('idle');
  const [logs, setLogs]         = useState<CrawlProgress[]>([]);
  const eventSourceRef          = useRef<EventSource | null>(null);

  const startCrawl = useCallback(async () => {
    setStatus('running');
    setLogs([]);

    // 1) 크롤링 시작 요청
    const res = await fetch('/api/scraper/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl: url }),
    });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      setStatus('idle');
      return;
    }

    // 2) SSE 스트림 구독
    const es = new EventSource('/api/scraper/stream');
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      const data: CrawlProgress = JSON.parse(e.data);
      setLogs(prev => [...prev, data]);

      if (data.type === 'complete' || data.type === 'stopped') {
        es.close();
        setStatus('done');
      }
    };

    es.onerror = () => {
      es.close();
      setStatus('done');
    };
  }, [url]);

  const stopCrawl = useCallback(async () => {
    await fetch('/api/scraper/stop', { method: 'POST' });
  }, []);

  const download = useCallback(() => {
    // 서버 스트림 다운로드 — 브라우저가 직접 파일 저장
    window.location.href = '/api/scraper/download';
  }, []);

  // ... JSX 렌더링
}
```

---

## 8. next.config.js 설정

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Puppeteer 관련 — 서버 번들에서 제외하지 않도록
  serverExternalPackages: ['puppeteer'],

  // API Route 타임아웃 해제 (로컬 전용)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
```

> **중요**: 로컬 실행 시 `next dev` 대신 `next build && next start` (custom server 모드)를 권장합니다.
> dev 모드에서는 Hot Reload가 서버 모듈 상태(SessionManager 싱글턴)를 초기화할 수 있습니다.

---

## 9. 에러 핸들링 전략

| 계층 | 전략 |
|------|------|
| **개별 페이지** | try-catch 격리 → 실패해도 전체 크롤링 계속 진행 |
| **네트워크 에러** | `page.goto` 실패 시 최대 2회 exponential backoff 재시도 (1s → 3s) |
| **타임아웃** | `pageTimeout`(기본 15s) 초과 시 해당 페이지 스킵, 로그 기록 |
| **메모리 보호** | `maxPages` 상한(기본 200) + 개별 markdown `byteSize` 모니터링 |
| **robots.txt** | 파싱 실패 시 관례상 허용, 차단 시 스킵 + 로그 |
| **브라우저 크래시** | `browser.on('disconnected')` 감지 → Job을 error 상태로 전환, 수집된 결과는 보존 |

### 재시도 로직 (PageProcessor 내부)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay  = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
```

---

## 10. 보안 체크리스트 (로컬 환경)

| 항목 | 대응 | 비고 |
|------|------|------|
| SSRF | `InputValidator`에서 private IP 대역 차단 | 로컬이라도 내부 서비스 보호 필요 |
| robots.txt | 기본 준수, 옵션으로 비활성화 가능 | 법적 리스크 최소화 |
| XSS via Markdown | 다운로드 전용이므로 브라우저 렌더링 없음 | 미리보기 추가 시 sanitize 필수 |
| Puppeteer sandbox | `--no-sandbox` 미사용 (기본 sandbox 유지) | 악성 JS 실행 방어 |
| 입력 검증 | URL 형식 + 프로토콜 + hostname 검증 | `javascript:`, `file:` 차단 |

---

## 11. 테스트 계획

### 11-1. 단위 테스트

```
InputValidator
  ✓ 유효한 http/https URL 통과
  ✓ file://, javascript:// 차단
  ✓ 127.0.0.1, 10.x.x.x, 192.168.x.x 차단
  ✓ metadata.google.internal 차단
  ✓ robots.txt 차단된 URL → isAllowed false

PageProcessor
  ✓ <article> 본문 우선 추출
  ✓ nav, footer, script 등 제거 후 변환
  ✓ GFM 테이블 정상 변환
  ✓ 빈 페이지 → 빈 마크다운 (에러 아님)

CrawlManager
  ✓ maxDepth 초과 URL 큐에 추가되지 않음
  ✓ maxPages 도달 시 즉시 루프 종료
  ✓ 외부 도메인 링크 필터링
  ✓ stop() 호출 시 graceful 중단
  ✓ 개별 페이지 에러가 전체를 죽이지 않음
  ✓ 동시 활성 페이지가 maxConcurrency 이하 유지
```

### 11-2. 통합 테스트

```
E2E 시나리오
  ✓ 소규모 사이트 (예: 정적 docs 사이트) 전체 크롤링 → .md 다운로드 → 가독성 확인
  ✓ SSE 스트림에서 실시간 로그 수신 확인
  ✓ 크롤링 중 [중단] → 부분 결과 다운로드 가능
  ✓ 동시 시작 요청 → 409 Conflict 반환 확인
  ✓ 대규모 사이트에서 maxPages=50 설정 → 정확히 50개 이하 수집
```

### 11-3. Markdown 품질 검증

```
변환 품질
  ✓ 제목 계층(h1~h6) 정확한 # 매핑
  ✓ 코드 블록 (언어 표시 포함) 보존
  ✓ 이미지 alt 텍스트 → ![alt](url) 변환
  ✓ 테이블 → GFM 파이프 테이블
  ✓ 목차 + 페이지 앵커 링크 작동
```

---

## 12. 향후 확장 고려사항

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| **증분 크롤링** | 이전 결과 대비 변경분만 수집 (ETag/Last-Modified) | Medium |
| **선택적 크롤링** | CSS selector 기반 특정 영역만 추출 | High |
| **출력 포맷 선택** | .md 외 .txt, .json, .pdf 지원 | Low |
| **프록시 지원** | Puppeteer launch args에 `--proxy-server` 옵션 | Low |
| **스케줄링** | cron 기반 주기적 크롤링 (node-cron) | Medium |
| **Electron 전환** | 장기적으로 데스크톱 앱 패키징 고려 | Future |
