import { NextResponse } from 'next/server';
import { session } from '@/lib/scraper/SessionManager';
import type { CrawlerConfig } from '@/lib/scraper/types';

export const dynamic = 'force-dynamic';

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
      headless:       body.requireLogin ? false : (body.headless ?? false),
      respectRobots:  body.respectRobots  ?? true,
      requireLogin:   body.requireLogin   ?? false,
    });

    return NextResponse.json({ jobId, status: 'started' });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 409 }   // Conflict: 이미 실행 중
    );
  }
}
