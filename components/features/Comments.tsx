"use client";

import { useEffect, useRef } from "react";

// Tech 블로그 댓글 = Giscus. 환경변수 미설정 시 안내 표시(값은 나중에 연결).
export function Comments() {
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
    s.setAttribute("data-mapping", "pathname");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-theme", theme);
    s.setAttribute("data-lang", "ko");
    ref.current.appendChild(s);
  }, [configured, repo, repoId, category, categoryId]);

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="mb-4 text-sm font-medium text-mut">댓글</h2>
      {configured ? (
        <div ref={ref} />
      ) : (
        <p className="rounded-xl border border-line p-4 text-sm text-mut">
          💬 댓글(Giscus)은 GitHub Discussions 설정 후 활성화됩니다.
        </p>
      )}
    </section>
  );
}
