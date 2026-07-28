// Tech 블로그 글(app/posts/[slug])과 포트폴리오 글(app/projects/[slug]) 상세 페이지가
// 공통으로 쓰는 MDX 렌더 옵션 모음. 헤딩에 앵커 id를 붙이고(rehype-slug), 코드블록을
// 라이트/다크 듀얼 테마로 하이라이트한다(rehype-pretty-code).
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

/** `next-mdx-remote`(또는 동급) 컴파일러에 그대로 스프레드해 넘기는 옵션 객체. */
export const mdxOptions = {
  mdxOptions: { rehypePlugins },
};
