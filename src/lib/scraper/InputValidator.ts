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
