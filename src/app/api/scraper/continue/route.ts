import { NextResponse } from 'next/server';
import { session } from '@/lib/scraper/SessionManager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await session.continueJob();
    return NextResponse.json({ status: 'running' });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
