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

    console.log(`[Scraper] Starting new job: ${jobId}`);
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
        if (config.requireLogin) {
          this.currentJob!.status = 'waiting_login';
          await this.manager!.prepareLogin();
          // 여기서 대기, 크롤링 루프는 continueJob()에서 호출됨
        } else {
          await this.executeCrawl();
        }
      } catch (err) {
        this.handleError(err);
      }
    })();

    return jobId;
  }

  async continueJob(): Promise<void> {
    if (this.currentJob?.status !== 'waiting_login') {
      throw new Error('대기 중인 작업이 아닙니다.');
    }
    
    this.currentJob.status = 'running';
    (async () => {
      try {
        await this.executeCrawl();
      } catch (err) {
        this.handleError(err);
      }
    })();
  }

  private async executeCrawl(): Promise<void> {
    const results = await this.manager!.crawl();
    this.currentJob!.results = results;
    this.currentJob!.status = 'done';
    await this.manager?.close();
  }

  private handleError(err: unknown) {
    console.error('[Scraper] Job Failed: ', err);
    if (this.currentJob) this.currentJob.status = 'error';
    const msg = (err as Error).message;
    this.listeners.forEach(fn =>
      fn({ type: 'page_error', totalDone: 0, totalQueue: 0, message: `오류: ${msg}`, timestamp: Date.now() })
    );
    this.manager?.close().catch(() => {});
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
