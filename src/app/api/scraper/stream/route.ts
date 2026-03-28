import { session } from '@/lib/scraper/SessionManager';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let unsub: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          if (unsub) {
            unsub();
            unsub = null;
          }
        }
      };

      // 기존 진행 기록 재전송 (재연결 대비)
      const job = session.getJob();
      let alreadyDone = false;
      if (job) {
        job.progress.forEach(p => {
          send(p);
          if (p.type === 'complete' || p.type === 'stopped') {
            alreadyDone = true;
          }
        });
      }

      if (alreadyDone) {
        try { controller.close(); } catch(e) {}
        return;
      }

      // 실시간 구독
      unsub = session.subscribe(p => {
        send(p);
        if (p.type === 'complete' || p.type === 'stopped') {
          try { controller.close(); } catch (e) {}
          if (unsub) {
            unsub();
            unsub = null;
          }
        }
      });

      // 요청 중단 시 정리
      req.signal.addEventListener('abort', () => {
        if (unsub) {
          unsub();
          unsub = null;
        }
      });
    },
    cancel() {
      // client disconnected
      if (unsub) {
        unsub();
        unsub = null;
      }
      session.stop();
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
