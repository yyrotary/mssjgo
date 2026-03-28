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
