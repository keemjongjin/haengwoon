"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminToast, describeFailure } from "@/components/admin/AdminToastContext";

type Comment = {
  id: number;
  targetType: string;
  targetId: number;
  authorName: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
};

type Album = { id: number; title: string };

export default function AdminCommentsPage() {
  const { showError } = useAdminToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [albums, setAlbums] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const [cRes, aRes] = await Promise.all([fetch("/api/admin/comments"), fetch("/api/albums")]);
    const cData = await cRes.json();
    const aData = await aRes.json();
    setComments(cData.comments ?? []);
    setAlbums(Object.fromEntries((aData.albums ?? []).map((a: Album) => [a.id, a.title])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleHidden(id: number, isHidden: boolean) {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !isHidden }),
    });
    if (res.ok) {
      await load();
    } else {
      showError(await describeFailure(res));
    }
  }

  async function remove(id: number) {
    if (!confirm("이 댓글을 완전히 삭제할까요?")) return;
    const res = await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
    } else {
      showError(await describeFailure(res));
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Comments ({comments.length})</h2>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl border border-line bg-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {c.authorName}
                <span className="ml-2 text-xs text-mut">
                  {c.targetType === "album" ? albums[c.targetId] ?? `앨범 #${c.targetId}` : c.targetType}
                </span>
              </span>
              <div className="flex gap-3 text-xs">
                <button onClick={() => toggleHidden(c.id, c.isHidden)} className="text-mut hover:text-fg">
                  {c.isHidden ? "숨김 해제" : "숨기기"}
                </button>
                <button onClick={() => remove(c.id)} className="text-mut hover:text-fg">
                  삭제
                </button>
              </div>
            </div>
            <p className={"mt-2 " + (c.isHidden ? "text-mut line-through" : "")}>{c.content}</p>
            <p className="mt-1 text-xs text-mut">{new Date(c.createdAt).toLocaleString("ko")}</p>
          </li>
        ))}
        {comments.length === 0 && <p className="text-sm text-mut">아직 댓글이 없습니다.</p>}
      </ul>
    </div>
  );
}
