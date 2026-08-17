// Tech 블로그 글(app/posts/[slug])과 포트폴리오 글(app/projects/[slug]) 상세 페이지가
// 공통으로 쓰는 MDX 렌더 옵션 모음. 표·취소선 등 GFM 문법을 해석하고(remark-gfm),
// 헤딩에 앵커 id를 붙이고(rehype-slug), 코드블록을 라이트/다크 듀얼 테마로 하이라이트한다
// (rehype-pretty-code).
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import type { Options as PrettyCodeOptions } from "rehype-pretty-code";
import { rehypeImageSize } from "./rehypeImageSize";
import { MdxImage } from "@/components/blog/MdxImage";

const prettyCodeOptions: PrettyCodeOptions = {
  // 라이트/다크 듀얼 테마 — 스팬에 --shiki-light / --shiki-dark 를 심고 CSS로 전환
  theme: { light: "github-light", dark: "github-dark" },
  keepBackground: false,
};

// ★ remark-gfm이 없으면 `| a | b |` 표 문법이 GFM 확장이라 기본 마크다운(CommonMark)으로는
//   파싱되지 않고 그냥 파이프 문자가 섞인 문단으로 렌더된다 — 표가 "전혀 작동하지 않는" 원인.
const remarkPlugins: PluggableList = [remarkGfm];

const rehypePlugins: PluggableList = [
  rehypeSlug,
  [rehypePrettyCode, prettyCodeOptions],
  // 코드 하이라이팅 다음 자리 — img 노드의 width/height를 여기서 미리 채워두면
  // MdxImage(아래 mdxComponents)가 매 렌더마다 다시 알아낼 필요 없이 값만 받아 쓴다.
  rehypeImageSize,
];

/** `next-mdx-remote`(또는 동급) 컴파일러에 그대로 스프레드해 넘기는 옵션 객체. */
export const mdxOptions = {
  mdxOptions: { remarkPlugins, rehypePlugins },
};

/** `<MDXRemote components={mdxComponents} />`로 넘겨 markdown img를 next/image로 대체한다. */
export const mdxComponents = {
  img: MdxImage,
};
