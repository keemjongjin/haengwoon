"use client";

import { useState } from "react";

// 기존에 쓴 장르 중에서 고르거나, 없으면 새로 추가. 자유 입력 대신 이걸 쓰면
// "Hip-Hop"과 "hiphop"처럼 표기가 갈라져 아카이브 필터가 깨지는 걸 막을 수 있다.
export function GenrePicker({
  genres,
  value,
  onChange,
  className,
}: {
  genres: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newGenre, setNewGenre] = useState("");

  // 현재 값이 아직 다른 앨범에 쓰인 적 없는 새 장르여도(막 추가한 직후) 목록에 보이도록 포함
  const options = Array.from(new Set([...genres.filter(Boolean), ...(value ? [value] : [])])).sort();

  if (adding) {
    return (
      <div className="flex min-w-0 flex-1 gap-2">
        <input
          autoFocus
          value={newGenre}
          onChange={(e) => setNewGenre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onChange(newGenre.trim());
              setAdding(false);
            }
            if (e.key === "Escape") setAdding(false);
          }}
          placeholder="새 장르 이름"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-acc"
        />
        <button
          type="button"
          onClick={() => {
            onChange(newGenre.trim());
            setAdding(false);
          }}
          className="shrink-0 rounded-lg border border-line px-2 py-1 text-xs hover:border-acc"
        >
          추가
        </button>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="shrink-0 text-xs text-mut hover:text-fg"
        >
          취소
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__add__") {
          setNewGenre("");
          setAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={
        className ??
        "min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1.5 text-sm outline-none focus:border-acc"
      }
    >
      <option value="">장르 없음</option>
      {options.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
      <option value="__add__">+ 새 장르 추가</option>
    </select>
  );
}
