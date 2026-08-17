// rehype 플러그인 — MDX 본문의 `img` 노드마다 실제 픽셀 치수를 미리 알아내 width/height
// 속성으로 심어준다. next/image는 원칙적으로 width/height(또는 fill)를 알아야 하는데, 마크다운
// `![alt](src)` 문법 자체엔 그 정보가 없다 — 렌더링 시점(React 트리)마다 다시 알아내는 대신,
// 이미 AST를 훑는 컴파일 단계(rehypeSlug·rehypePrettyCode와 같은 자리, lib/content/mdx.ts)에서
// 한 번만 계산해두고, MdxImage 컴포넌트(components/blog/MdxImage.tsx)는 그 값을 props로
// 받아 쓰기만 한다.
//
// 로컬 이미지(`/`로 시작하는 루트 상대경로, public/ 아래)는 파일을 직접 읽고, 원격 이미지
// (http/https)는 바이트를 받아와 헤더만 디코드한다. 어느 쪽이든 실패하면(파일 없음·네트워크
// 오류·지원 안 하는 포맷) 조용히 건너뛴다 — width/height가 없으면 MdxImage가 평범한 <img>로
// 폴백해서 그리는 것이지, 글 전체가 깨지면 안 되기 때문이다.
import fs from "node:fs/promises";
import path from "node:path";
import { visit } from "unist-util-visit";
import { imageSize } from "image-size";
import type { Root, Element } from "hast";

const PUBLIC_DIR = path.join(process.cwd(), "public");

async function probeLocal(src: string): Promise<{ width: number; height: number } | null> {
  try {
    const buf = await fs.readFile(path.join(PUBLIC_DIR, src));
    const { width, height } = imageSize(buf);
    return { width, height };
  } catch {
    return null;
  }
}

async function probeRemote(src: string): Promise<{ width: number; height: number } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const { width, height } = imageSize(buf);
    return { width, height };
  } catch {
    return null;
  }
}

export function rehypeImageSize() {
  return async function transformer(tree: Root) {
    const jobs: Promise<void>[] = [];

    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const src = node.properties?.src;
      if (typeof src !== "string" || !src) return;
      // 이미 width/height가 있으면(직접 마크다운 확장문법 등으로 지정) 건드리지 않는다.
      if (node.properties?.width && node.properties?.height) return;

      const isLocal = src.startsWith("/") && !src.startsWith("//");
      const isRemote = /^https?:\/\//.test(src);
      if (!isLocal && !isRemote) return;

      jobs.push(
        (isLocal ? probeLocal(src) : probeRemote(src)).then((size) => {
          if (!size) return;
          node.properties.width = size.width;
          node.properties.height = size.height;
        }),
      );
    });

    await Promise.all(jobs);
    return tree;
  };
}
