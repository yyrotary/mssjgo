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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
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
