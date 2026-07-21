import type { PluggableList } from "unified";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import type { Options as PrettyCodeOptions } from "rehype-pretty-code";

const prettyCodeOptions: PrettyCodeOptions = {
  // 라이트/다크 듀얼 테마 — 스팬에 --shiki-light / --shiki-dark 를 심고 CSS로 전환
  theme: { light: "github-light", dark: "github-dark" },
  keepBackground: false,
};

const rehypePlugins: PluggableList = [
  rehypeSlug,
  [rehypePrettyCode, prettyCodeOptions],
];

// 포스트/프로젝트 상세에서 공통으로 쓰는 MDX 렌더 옵션
export const mdxOptions = {
  mdxOptions: { rehypePlugins },
};
