"use client";

import { useEffect, useRef } from "react";

// Giscus(GitHub Discussions) 위젯. term이 있으면 모든 방문자가 같은 스레드에 모이는
// "고정 매핑"(방명록용) — 없으면 현재 경로별 매핑(글 댓글용).
export function Comments({ term }: { term?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
  const configured = Boolean(repo && repoId && category && categoryId);

  useEffect(() => {
    if (!configured || !ref.current || ref.current.childElementCount > 0) return;
    const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-repo", repo!);
    s.setAttribute("data-repo-id", repoId!);
    s.setAttribute("data-category", category!);
    s.setAttribute("data-category-id", categoryId!);
    if (term) {
      s.setAttribute("data-mapping", "specific");
      s.setAttribute("data-term", term);
    } else {
      s.setAttribute("data-mapping", "pathname");
    }
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-theme", theme);
    s.setAttribute("data-lang", "ko");
    ref.current.appendChild(s);
  }, [configured, repo, repoId, category, categoryId, term]);

  return (
    <>
      {configured ? (
        <div ref={ref} />
      ) : (
        <p className="rounded-xl border border-line p-4 text-sm text-mut">
          💬 댓글(Giscus)은 GitHub Discussions 설정 후 활성화됩니다.
        </p>
      )}
    </>
  );
}
