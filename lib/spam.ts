// 스팸 방어 (DECISIONS.log): 허니팟 → 제출시간 → 레이트리밋 → 콘텐츠 휴리스틱.
// 무료·서버리스 친화. (심화 시 Cloudflare Turnstile 도입 여지)

const BANNED = ["viagra", "casino", "카지노", "토토", "무료머니"];

// 인메모리 레이트리밋 (IP당 60초 내 5회). DB/Upstash로 교체 가능.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_HITS;
}

export type SpamInput = {
  content: string;
  honeypot?: string; // 숨김 필드 — 채워지면 봇
  elapsedMs?: number; // 폼 로드~제출 경과
  ip: string;
};

export function checkSpam(input: SpamInput): { ok: boolean; reason?: string } {
  const { content, honeypot, elapsedMs, ip } = input;

  if (honeypot && honeypot.trim() !== "") return { ok: false, reason: "honeypot" };
  if (typeof elapsedMs === "number" && elapsedMs < 2000)
    return { ok: false, reason: "too-fast" };

  const text = content.trim();
  if (text.length < 1 || text.length > 1000)
    return { ok: false, reason: "length" };

  const linkCount = (text.match(/https?:\/\//g) ?? []).length;
  if (linkCount > 2) return { ok: false, reason: "too-many-links" };

  const lower = text.toLowerCase();
  if (BANNED.some((w) => lower.includes(w))) return { ok: false, reason: "banned-word" };

  if (rateLimited(ip)) return { ok: false, reason: "rate-limited" };

  return { ok: true };
}
