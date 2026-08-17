// 외부 URL의 Open Graph 메타태그를 읽어와 LinkPreview 카드에 쓸 데이터로 정리한다.
// cheerio 같은 HTML 파서를 새로 설치하는 대신, 우리한테 필요한 건 <meta> 태그 몇 개뿐이라
// 정규식으로 직접 뽑는다 — 의존성을 늘리지 않으려는 이 프로젝트의 방향과 맞는다.
export type OgData = {
  title: string;
  description?: string;
  image?: string;
  siteName: string;
  url: string;
};

/** HTML 문자열에서 <meta property="..."/name="..." content="..."> 전부를 {키: content} 맵으로. */
function extractMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const metaTagRegex = /<meta\s+[^>]*>/gi;
  for (const tag of html.match(metaTagRegex) ?? []) {
    const key = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content !== undefined) tags[key] = content;
  }
  return tags;
}

/**
 * url의 HTML을 가져와 og:title/description/image(og:title 없으면 twitter:title까지만 폴백)를
 * 뽑는다. 실패하면(사이트 다운, 타임아웃, HTML이 아닌 응답, og/twitter title 둘 다 없음) null
 * — 호출부(LinkPreview)가 평범한 링크로 폴백해서 그린다. 페이지 하나가 죽은 외부 링크 때문에
 * 통째로 500 나면 안 되므로 여기서 예외를 삼킨다.
 *
 * <title> 태그로는 폴백하지 않는다 — 봇 차단 페이지("Client Challenge", "Just a moment...",
 * "Access Denied" 등)는 og 태그 없이 <title>만 있는 경우가 많아서, 이걸 그대로 받으면 진짜
 * 콘텐츠 대신 봇 차단 안내문이 카드에 뜬다(nature.com에서 실제로 겪음). og/twitter:title이
 * 없다는 건 대개 이 페이지 정보를 신뢰할 수 없다는 신호라, 차라리 평범한 링크로 폴백한다.
 */
export async function fetchOgData(url: string): Promise<OgData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HaengwoonLinkPreview/1.0)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return null;

    const html = await res.text();
    const meta = extractMetaTags(html);

    const title = meta["og:title"] || meta["twitter:title"];
    if (!title) return null;

    const description = meta["og:description"] || meta["twitter:description"] || meta["description"];
    const rawImage = meta["og:image"] || meta["twitter:image"];
    // og:image는 명세상 절대 URL이어야 하지만, 상대 경로로 주는 사이트도 있어 방어적으로 resolve.
    const image = rawImage ? new URL(rawImage, url).toString() : undefined;
    const siteName = meta["og:site_name"] || new URL(url).hostname.replace(/^www\./, "");

    return { title, description, image, siteName, url };
  } catch {
    return null;
  }
}
