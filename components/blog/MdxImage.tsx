import Image from "next/image";
import { ALLOWED_IMAGE_HOSTS } from "@/lib/content/imageHosts";

/**
 * MDX `![alt](src)`가 최종적으로 거치는 `<img>` 자리를 가로채 next/image로 바꿔치기한다.
 * width/height는 렌더링 시점이 아니라 컴파일 시점에 rehypeImageSize(lib/content/mdx.ts)가
 * 미리 재서 이 컴포넌트의 props로 흘려보낸 값 — 이 컴포넌트는 그 값을 받아 쓰기만 한다.
 *
 * next/image로 못 넘기는 두 경우는 평범한 <img>로 폴백한다(전체 렌더가 깨지는 것보다 낫다):
 * ① rehypeImageSize가 치수를 못 알아낸 경우(width/height 없음)
 * ② 원격 이미지인데 next.config.ts의 remotePatterns(ALLOWED_IMAGE_HOSTS)에 없는 호스트인 경우
 *    — 등록 안 된 호스트를 next/image에 넘기면 그 요청만 500이 난다.
 */
export function MdxImage({
  src,
  alt,
  width,
  height,
}: {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}) {
  if (!src || !width || !height) {
    // eslint-disable-next-line @next/next/no-img-element -- 의도적 폴백, next/image 불가 경로
    return <img src={src} alt={alt ?? ""} />;
  }

  const isLocal = src.startsWith("/") && !src.startsWith("//");
  const isAllowedRemote =
    /^https?:\/\//.test(src) && ALLOWED_IMAGE_HOSTS.some((h) => new URL(src).hostname === h);

  if (!isLocal && !isAllowedRemote) {
    // eslint-disable-next-line @next/next/no-img-element -- 최적화 대상 밖 호스트, 원본 그대로
    return <img src={src} alt={alt ?? ""} width={width} height={height} />;
  }

  return (
    <Image
      src={src}
      alt={alt ?? ""}
      width={width}
      height={height}
      sizes="(min-width: 768px) 700px, 100vw"
      style={{ width: "100%", height: "auto" }}
    />
  );
}
