import { fetchOgData } from "@/lib/content/ogFetch";

/**
 * MDX 본문에서 `<LinkPreview url="https://..." />`로 쓰는 참고 링크 카드.
 * async 서버 컴포넌트라서, 정적으로 생성되는 글은 빌드 시점에 딱 한 번만 외부 사이트를
 * fetch한다 — 방문자가 볼 때마다 다시 불러오지 않는다.
 *
 * OG 태그를 못 가져오면(사이트가 막았거나, 다운됐거나, 제목조차 없거나) 카드 대신 평범한
 * 링크로 폴백한다. 미리보기 이미지는 임의의 외부 호스트에서 오기 때문에 next.config.ts에
 * 전부 등록해둘 수 없어 next/image를 못 쓰고 원본 그대로 <img>로 띄운다(MdxImage가 허용
 * 안 된 원격 호스트를 처리하는 것과 같은 타협).
 */
export async function LinkPreview({ url }: { url: string }) {
  const og = await fetchOgData(url);

  if (!og) {
    // 링크 스타일은 .article a(globals.css)가 그대로 처리한다 — 평범한 본문 링크와
    // 다를 게 없는 폴백이라 여기 특별한 클래스가 필요 없다.
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="link-preview group my-5 flex overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-acc"
    >
      {og.image && (
        // eslint-disable-next-line @next/next/no-img-element -- 임의의 외부 호스트라 next/image 최적화 대상 밖
        <img src={og.image} alt="" className="hidden w-40 shrink-0 object-cover sm:block" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
        <span className="line-clamp-1 font-semibold text-fg group-hover:text-acc">{og.title}</span>
        {og.description && (
          <span className="line-clamp-2 text-sm text-mut">{og.description}</span>
        )}
        <span className="mt-1 text-xs text-mut">{og.siteName}</span>
      </div>
    </a>
  );
}
