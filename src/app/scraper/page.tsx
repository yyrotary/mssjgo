'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { CrawlProgress } from '@/lib/scraper/types';

export default function ScraperPage() {
  const [url, setUrl]           = useState('');
  const [status, setStatus]     = useState<'idle'|'running'|'stopping'|'done'|'waiting_login'>('idle');
  const [logs, setLogs]         = useState<CrawlProgress[]>([]);
  const [stats, setStats]       = useState({ totalDone: 0, totalQueue: 0 });
  const eventSourceRef          = useRef<EventSource | null>(null);
  const logContainerRef         = useRef<HTMLDivElement>(null);

  const [config, setConfig]     = useState({
    maxDepth: 5,
    maxPages: 50,
    maxConcurrency: 3,
    requestDelay: 500,
    requireLogin: false
  });

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const startCrawl = useCallback(async () => {
    if (!url) return alert('시작 URL을 입력해주세요.');
    setStatus('running');
    setLogs([]);

    // 1) 크롤링 시작 요청
    const res = await fetch('/api/scraper/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl: url, ...config }),
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
      setStats({ totalDone: data.totalDone, totalQueue: data.totalQueue });

      if (data.type === 'waiting_login') {
        setStatus('waiting_login');
      }

      if (data.type === 'complete' || data.type === 'stopped') {
        es.close();
        setStatus('done');
      }
    };

    es.onerror = () => {
      es.close();
      setStatus('done');
    };
  }, [url, config]);

  const stopCrawl = useCallback(async () => {
    setStatus('stopping');
    await fetch('/api/scraper/stop', { method: 'POST' });
  }, []);

  const continueCrawl = useCallback(async () => {
    setStatus('running');
    const res = await fetch('/api/scraper/continue', { method: 'POST' });
    if (!res.ok) {
      const { error } = await res.json();
      alert(error);
      setStatus('done');
    }
  }, []);

  const download = useCallback(() => {
    // 서버 스트림 다운로드
    window.location.href = '/api/scraper/download';
  }, []);

  const progressPercent = config.maxPages > 0 
    ? Math.min(100, Math.round((stats.totalDone / config.maxPages) * 100))
    : 0;

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-20 bg-gradient-to-b from-[#09090b] to-[#000000]">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-600">
            Web Scraper
          </h1>
          <p className="text-lg text-neutral-400">지정한 URL 하위의 문서를 탐색하여 로컬 마크다운(.md)으로 보관합니다.</p>
        </header>

        <section className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-2xl space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="url" 
              placeholder="https://example.com/docs" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'running' || status === 'stopping'}
              className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
            {status === 'idle' || status === 'done' ? (
              <button onClick={startCrawl} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shrink-0">
                크롤링 시작
              </button>
            ) : status === 'waiting_login' ? (
              <button onClick={continueCrawl} className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold rounded-xl transition-colors shrink-0 animate-pulse">
                로그인 완료 (계속)
              </button>
            ) : (
              <button onClick={stopCrawl} disabled={status === 'stopping'} className="px-8 py-3 bg-red-600/80 hover:bg-red-500/80 text-white font-semibold rounded-xl transition-colors shrink-0">
                {status === 'stopping' ? '중지 중...' : '크롤링 중지'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-white/5">
            <div className="space-y-1 md:col-span-5 mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 w-max">
                <input 
                  type="checkbox"
                  checked={config.requireLogin}
                  onChange={e => setConfig({...config, requireLogin: e.target.checked})}
                  disabled={status !== 'idle' && status !== 'done'}
                  className="rounded border-white/10 bg-black/50 text-blue-500 focus:ring-blue-500/50"
                />
                로그인 필요 (브라우저 직접 띄우기)
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Max Depth 제한</label>
              <input type="number" value={config.maxDepth} onChange={e => setConfig({...config, maxDepth: Number(e.target.value)})} disabled={status !== 'idle' && status !== 'done'} className="w-full bg-black/50 border border-white/10 px-3 py-1.5 rounded text-sm text-neutral-200" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">최대 수집 페이지 제한</label>
              <input type="number" value={config.maxPages} onChange={e => setConfig({...config, maxPages: Number(e.target.value)})} disabled={status !== 'idle' && status !== 'done'} className="w-full bg-black/50 border border-white/10 px-3 py-1.5 rounded text-sm text-neutral-200" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">동시 탭 (Concurrency)</label>
              <input type="number" value={config.maxConcurrency} onChange={e => setConfig({...config, maxConcurrency: Number(e.target.value)})} disabled={status !== 'idle' && status !== 'done'} className="w-full bg-black/50 border border-white/10 px-3 py-1.5 rounded text-sm text-neutral-200" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">요청 딜레이 (ms)</label>
              <input type="number" step="100" value={config.requestDelay} onChange={e => setConfig({...config, requestDelay: Number(e.target.value)})} disabled={status !== 'idle' && status !== 'done'} className="w-full bg-black/50 border border-white/10 px-3 py-1.5 rounded text-sm text-neutral-200" />
            </div>
          </div>
        </section>

        {/* Progress Display */}
        {status !== 'idle' && (
          <section className="bg-black/50 border border-white/10 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-300 font-medium">진행 상황</span>
              <span className="text-blue-400 font-mono">
                {stats.totalDone} / {config.maxPages} (Queue: {stats.totalQueue})
              </span>
            </div>
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </section>
        )}

        {/* Logs Console */}
        <section className="bg-black border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[400px]">
          <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono text-neutral-400 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-neutral-600'}`} />
              Crawler Terminal
            </span>
            {status === 'done' && (
              <button onClick={download} className="text-xs bg-emerald-600/80 hover:bg-emerald-500 text-white px-3 py-1 rounded transition-colors">
                .md 다운로드
              </button>
            )}
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-3 leading-relaxed ${
                log.type === 'page_error' ? 'text-red-400' : 
                log.type === 'waiting_login' ? 'text-fuchsia-400 font-bold' :
                log.type === 'page_done' ? 'text-neutral-300' : 
                log.type === 'complete' ? 'text-emerald-400 font-bold' :
                'text-neutral-500'
              }`}>
                <span className="text-neutral-600 shrink-0">
                  {new Date(log.timestamp).toISOString().split('T')[1].slice(0, 8)}
                </span>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-neutral-600 italic">대기 중... URL을 입력하고 시작 버튼을 누르세요.</div>
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
