"use client";

import { useEffect, useRef, useState } from "react";

type Comment = { id: number; authorName: string; content: string; createdAt: string };

export function AlbumComments({ albumId }: { albumId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState(""); // 봇 트랩
  const [msg, setMsg] = useState("");
  const mountedAt = useRef(Date.now());

  async function load() {
    const res = await fetch(`/api/comments?targetType=album&targetId=${albumId}`);
    const data = await res.json();
    setComments(data.comments);
  }
  useEffect(() => {
    load();
    mountedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId]);

  async function submit() {
    setMsg("");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "album",
        targetId: albumId,
        authorName: name,
        password,
        content,
        honeypot,
        elapsedMs: Date.now() - mountedAt.current,
      }),
    });
    if (res.ok) {
      setContent("");
      setPassword("");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error?.startsWith("spam") ? "스팸으로 감지되어 등록되지 않았습니다." : "등록 실패");
    }
  }

  async function remove(id: number) {
    const pw = prompt("비밀번호를 입력하세요");
    if (pw == null) return;
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: pw }),
    });
    if (res.ok) await load();
    else alert("비밀번호가 틀렸습니다.");
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="mb-4 text-sm font-medium text-mut">댓글 {comments.length}</h2>

      <div className="mb-6 space-y-2">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-32 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-acc"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-32 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-acc"
          />
        </div>
        {/* 허니팟: 사람에겐 안 보임 */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px" }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 남겨보세요"
          rows={3}
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-acc"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={submit}
            className="rounded-full bg-acc px-5 py-2 text-sm font-semibold text-on-acc"
          >
            등록
          </button>
          {msg && <span className="text-xs text-red-500">{msg}</span>}
        </div>
      </div>

      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-line pb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.authorName}</span>
              <button onClick={() => remove(c.id)} className="text-xs text-mut hover:text-fg">
                삭제
              </button>
            </div>
            <p className="mt-1 text-sm">{c.content}</p>
            <p className="mt-1 text-xs text-mut">{new Date(c.createdAt).toLocaleString("ko")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
