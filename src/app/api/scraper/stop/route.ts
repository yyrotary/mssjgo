import { NextResponse } from 'next/server';
import { session } from '@/lib/scraper/SessionManager';

export const dynamic = 'force-dynamic';

export async function POST() {
  session.stop();
  return NextResponse.json({ status: 'stopping' });
}
