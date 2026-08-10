// LP판 자체의 생김새(색·무늬)를 CSS로 바꿔 그리는 모듈.
//
// MD Vinyl처럼 판마다 다른 색·무늬를 갖게 하려고 만들었다. 관리자가 월간 추천을 고를 때
// 앨범별로 지정하고, 플레이어의 도는 판이 그대로 반영한다.
//
// 이미지가 아니라 CSS 그라디언트로만 만든다 — 판은 회전 애니메이션이 걸린 채로 계속 다시
// 그려지는 요소라, 텍스처 이미지를 얹으면 로딩·용량·선명도(고해상도 화면) 문제가 한꺼번에 붙는다.
// 그라디언트는 벡터라 어떤 크기에서도 깨지지 않고 추가 요청도 없다.

/** 판 무늬 종류. DB에는 이 문자열이 그대로 들어간다. */
export type LpPattern = "classic" | "solid" | "splatter" | "swirl";

/** 관리자 UI에 뿌릴 무늬 목록(순서 = 화면 표시 순서). */
export const LP_PATTERNS: { id: LpPattern; label: string }[] = [
  { id: "classic", label: "클래식 (검정)" },
  { id: "solid", label: "단색" },
  { id: "splatter", label: "스플래터" },
  { id: "swirl", label: "마블" },
];

/** 색 고를 때 기본으로 보여줄 팔레트. 실제 컬러 바이닐에서 흔한 색들로 골랐다. */
export const LP_COLOR_PRESETS = [
  "#191920", // 검정 (기본)
  "#7a1220", // 와인
  "#c2410c", // 오렌지
  "#b45309", // 앰버
  "#166534", // 딥그린
  "#155e75", // 틸
  "#1e3a8a", // 네이비
  "#6b21a8", // 퍼플
  "#be185d", // 마젠타
  "#e5e7eb", // 화이트
];

/** 판의 기본 색 — 지정 없으면 이 색(기존 검정판과 동일). */
const DEFAULT_COLOR = "#191920";

/**
 * 홈(groove) 무늬. 어떤 색·무늬를 골라도 항상 맨 위에 얹어야 "판"으로 읽힌다.
 * 간격을 3/6px로 둔 건 Safari가 더 촘촘한 반복 그라디언트에서 배경을 통째로 못 그리는
 * 사례가 있었기 때문(자세한 경위는 AlbumPlayerView의 판 렌더 주석 참고).
 */
const GROOVES =
  "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0 3px, rgba(0,0,0,0) 3px 6px)";

/** "#rrggbb" → [r,g,b]. 형식이 어긋나면 null(호출측이 기본색으로 넘어간다). */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amount>0이면 흰색 쪽으로, <0이면 검정 쪽으로 섞는다(-1~1). */
function mix(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const [r, g, b] = rgb.map((c) => Math.round(c + (target - c) * t));
  return `rgb(${r} ${g} ${b})`;
}

/** 판에 그대로 넣을 수 있는 인라인 스타일 조각. */
export type LpSurface = { backgroundColor: string; backgroundImage: string };

/**
 * 색·무늬 설정을 판의 배경 스타일로 바꾼다.
 *
 * ★ backgroundColor(단색)와 backgroundImage(무늬)를 반드시 분리해서 돌려준다.
 *   background 단축 속성에 그라디언트만 담으면, 브라우저가 그 그라디언트를 못 그릴 때
 *   배경이 통째로 사라져 판이 아예 안 보인다(예전에 Safari에서 실제로 겪음).
 *   단색을 바닥에 깔아두면 무늬가 실패해도 판은 반드시 남는다.
 */
export function lpSurface(color: string | null | undefined, pattern: string | null | undefined): LpSurface {
  const base = color && parseHex(color) ? color : DEFAULT_COLOR;
  const p = (pattern ?? "classic") as LpPattern;

  // classic은 색 지정을 무시하고 항상 검정 — "기본 판"이라는 뜻을 유지한다
  if (p === "classic") {
    return { backgroundColor: DEFAULT_COLOR, backgroundImage: GROOVES };
  }

  if (p === "splatter") {
    // 밝은 반점과 어두운 반점을 섞어 뿌린다. 좌표·크기를 고정해둔 건 판이 회전할 때마다
    // 무늬가 달라지면 안 되기 때문(렌더마다 난수를 쓰면 깜빡이는 것처럼 보인다).
    const light = mix(base, 0.45);
    const dark = mix(base, -0.4);
    const blobs = [
      [28, 24, 9, light],
      [70, 18, 6, dark],
      [82, 52, 11, light],
      [62, 78, 7, dark],
      [24, 70, 10, dark],
      [12, 46, 6, light],
      [48, 34, 5, light],
      [40, 88, 8, light],
      [88, 84, 5, dark],
      [56, 58, 4, dark],
    ] as const;
    const splatter = blobs
      .map(([x, y, r, c]) => `radial-gradient(circle at ${x}% ${y}%, ${c} 0 ${r}%, rgba(0,0,0,0) ${r}%)`)
      .join(", ");
    return { backgroundColor: base, backgroundImage: `${GROOVES}, ${splatter}` };
  }

  if (p === "swirl") {
    // 두 색이 돌아가며 섞이는 마블. conic-gradient는 중심 기준이라 판의 회전과 결이 맞는다.
    const light = mix(base, 0.38);
    const dark = mix(base, -0.35);
    return {
      backgroundColor: base,
      backgroundImage: `${GROOVES}, conic-gradient(from 210deg at 50% 50%, ${dark}, ${light} 22%, ${dark} 45%, ${light} 68%, ${dark} 88%, ${dark})`,
    };
  }

  // solid — 고른 색 그대로 + 홈
  return { backgroundColor: base, backgroundImage: GROOVES };
}
