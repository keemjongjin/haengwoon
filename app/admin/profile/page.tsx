"use client";

import { useEffect, useState } from "react";

export default function AdminProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setDisplayName(d.profile.displayName);
        setPhotoUrl(d.profile.photoUrl ?? "");
        setLoaded(true);
      });
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, photoUrl }),
    });
    setSaving(false);
    setMsg(res.ok ? "저장됐습니다." : "저장에 실패했습니다.");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!loaded) return <p className="text-mut">불러오는 중…</p>;

  return (
    <div className="max-w-sm">
      <h2 className="mb-2 text-lg font-semibold">Profile</h2>
      <p className="mb-6 text-sm text-mut">
        스토리 공유 카드 상단에 표시되는 이름과 사진이에요. 사진은 파일 업로드 대신 이미 호스팅된
        이미지의 URL을 입력해주세요. 단, 인스타그램 CDN 등 CORS를 막아둔 곳의 링크는 카드 이미지
        생성 시 표시되지 않아요 — <code className="rounded bg-card px-1 py-0.5">public/</code> 폴더에
        사진을 넣고 <code className="rounded bg-card px-1 py-0.5">/파일명.jpg</code>처럼 사이트 자체
        경로로 넣거나, Imgur·GitHub 등 CORS를 허용하는 곳에 올린 링크를 쓰는 걸 추천해요.
      </p>

      <label className="mb-1 block text-xs text-mut">이름</label>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="이름"
        className="mb-4 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-acc"
      />

      <label className="mb-1 block text-xs text-mut">사진 URL</label>
      <input
        value={photoUrl}
        onChange={(e) => setPhotoUrl(e.target.value)}
        placeholder="https://..."
        className="mb-4 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-acc"
      />

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="미리보기"
          className="mb-4 h-16 w-16 rounded-full object-cover"
        />
      )}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-full bg-acc px-5 py-2.5 text-sm font-semibold text-on-acc disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
      {msg && <p className="mt-2 text-sm text-mut">{msg}</p>}
    </div>
  );
}
