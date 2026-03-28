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
      maxDepth:       config.maxDepth ?? 5,
      maxPages:       config.maxPages ?? 200,
      maxConcurrency: config.maxConcurrency ?? 3,
      pageTimeout:    config.pageTimeout ?? 15_000,
      requestDelay:   config.requestDelay ?? 500,
      headless:       config.headless ?? false,
      respectRobots:  config.respectRobots ?? true,
      startUrl:       config.startUrl,
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

  /** 수동 로그인을 위해 시작 URL 열기 */
  async prepareLogin(): Promise<void> {
    if (!this.browser) throw new Error('브라우저가 아직 시작되지 않았습니다.');

    const { valid, url, error } = this.validator.validateUrl(this.config.startUrl);
    if (!valid || !url) throw new Error(error);

    this.originHostname = url.hostname;
    this.originUrl = url.origin;

    const page = await this.browser.newPage();
    await page.goto(url.href, { waitUntil: 'networkidle2', timeout: this.config.pageTimeout });
    
    // 이 페이지 인스턴스는 사용자가 직접 닫거나 크롤링 시 재활용 없이 남겨둠
    this.emit('waiting_login', `로그인 대기 중: 브라우저 창에서 로그인을 마친 후 '계속'을 눌러주세요.`);
    this.activePages++; // 유지용
  }

  /** 크롤링 실행 — BFS + Concurrency Limiter */
  async crawl(): Promise<Map<string, PageResult>> {
    if (!this.browser) throw new Error('브라우저가 아직 시작되지 않았습니다.');

    const { valid, url, error } = this.validator.validateUrl(this.config.startUrl);
    if (!valid || !url) throw new Error(error);

    this.originHostname = url.hostname;
    this.originUrl = url.origin;
    
    // prepareLogin으로 띄운 페이지가 있다면 유지 카운트 감소 (크롤링 병렬성에 방해되지 않도록)
    if (this.config.requireLogin && this.activePages > 0) {
      this.activePages--;
    }

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
