// LP판 자체의 생김새(색·마감·무늬)를 CSS로 바꿔 그리는 모듈.
//
// MD Vinyl처럼 판마다 다른 모습을 갖게 하려고 만들었다. 관리자가 월간 추천을 고를 때
// 앨범별로 지정하고, 플레이어의 도는 판이 그대로 반영한다.
//
// 종류는 실제 컬러 바이닐 프레스에서 쓰는 구분을 그대로 따랐다 —
// 블랙 / 컬러(불투명) / 투명 / 파스텔 같은 "마감"과, 스플래터 / 마블 / 스월 / 픽쳐 디스크 같은
// "무늬"가 한 축에 모여 있다. 실제로도 한 장의 판은 이 중 하나로 프레스되지 조합되지 않는다.
//
// 이미지가 아니라 CSS 그라디언트로 만든다(픽쳐 디스크만 예외) — 판은 회전 애니메이션이 걸린 채
// 계속 다시 그려지는 요소라, 텍스처 이미지를 얹으면 로딩·용량·선명도 문제가 한꺼번에 붙는다.
// 그라디언트는 벡터라 어떤 크기에서도 깨지지 않고 추가 요청도 없다.

/** 판 종류. DB(albums.lp_pattern)에는 이 문자열이 그대로 들어간다. */
export type LpPattern =
  | "classic" // 블랙
  | "solid" // 컬러 (불투명)
  | "clear" // 투명
  | "pastel" // 파스텔
  | "splatter" // 스플래터
  | "marble" // 마블
  | "swirl" // 스월
  | "picture"; // 픽쳐 디스크 (커버를 판에 인쇄)

/** 관리자 UI에 뿌릴 목록(순서 = 화면 표시 순서). */
export const LP_PATTERNS: { id: LpPattern; label: string }[] = [
  { id: "classic", label: "블랙" },
  { id: "solid", label: "컬러 (불투명)" },
  { id: "clear", label: "투명" },
  { id: "pastel", label: "파스텔" },
  { id: "splatter", label: "스플래터" },
  { id: "marble", label: "마블" },
  { id: "swirl", label: "스월" },
  { id: "picture", label: "픽쳐 디스크" },
];

/** 색을 쓰지 않는 종류 — 관리자 UI에서 색 선택을 감추는 데 쓴다. */
export const LP_PATTERNS_WITHOUT_COLOR: LpPattern[] = ["classic", "picture"];

/** 색 고를 때 보여줄 팔레트. 실제 컬러 바이닐에서 흔한 색들로 골랐다. */
export const LP_COLOR_PRESETS = [
  "#191920", // 검정
  "#7a1220", // 와인
  "#c2410c", // 오렌지
  "#b45309", // 앰버
  "#eab308", // 옐로
  "#166534", // 딥그린
  "#4d7c0f", // 올리브
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
export const LP_GROOVES =
  "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0 3px, rgba(0,0,0,0) 3px 6px)";

/** 투명·픽쳐 디스크처럼 바탕이 밝거나 그림인 판에는 어두운 홈이 더 잘 보인다. */
const LP_GROOVES_DARK =
  "repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.12) 0 3px, rgba(0,0,0,0) 3px 6px)";

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

/** 같은 색을 알파만 넣어서. 투명 바이닐용. */
function alpha(hex: string, a: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${a})`;
}

/** 판에 그대로 넣을 수 있는 인라인 스타일 조각. */
export type LpSurface = {
  backgroundColor: string;
  backgroundImage: string;
  /** true면 커버 이미지를 판 면에 깔아야 한다(픽쳐 디스크). 배경만으로는 표현할 수 없어 분리. */
  picture: boolean;
  /** 픽쳐 디스크 위에 얹을 홈 무늬 — 그림이 비치도록 어두운 쪽을 쓴다. */
  pictureGrooves: string;
};

/**
 * 색·종류 설정을 판의 배경 스타일로 바꾼다.
 *
 * ★ backgroundColor(단색)와 backgroundImage(무늬)를 반드시 분리해서 돌려준다.
 *   background 단축 속성에 그라디언트만 담으면, 브라우저가 그 그라디언트를 못 그릴 때
 *   배경이 통째로 사라져 판이 아예 안 보인다(예전에 Safari에서 실제로 겪음).
 *   단색을 바닥에 깔아두면 무늬가 실패해도 판은 반드시 남는다.
 */
export function lpSurface(color: string | null | undefined, pattern: string | null | undefined): LpSurface {
  const base = color && parseHex(color) ? color : DEFAULT_COLOR;
  const p = (pattern ?? "classic") as LpPattern;
  const flat = { picture: false, pictureGrooves: LP_GROOVES_DARK };

  switch (p) {
    // 블랙 — 색 지정을 무시하고 항상 검정. "기본 판"이라는 뜻을 유지한다.
    case "classic":
      return { backgroundColor: DEFAULT_COLOR, backgroundImage: LP_GROOVES, ...flat };

    // 투명 — 뒤가 비쳐야 하므로 알파를 넣는다. 자켓 위에 얹히면 자켓이 은은히 비친다.
    // 홈은 어두운 쪽을 써야 밝은 바탕에서도 결이 보인다.
    case "clear":
      return { backgroundColor: alpha(base, 0.42), backgroundImage: LP_GROOVES_DARK, ...flat };

    // 파스텔 — 같은 색을 흰색 쪽으로 크게 밀어 분필 같은 톤으로.
    case "pastel":
      return { backgroundColor: mix(base, 0.62), backgroundImage: LP_GROOVES_DARK, ...flat };

    // 스플래터 — 밝은 반점과 어두운 반점을 섞어 뿌린다. 좌표·크기를 고정해둔 건 판이 회전할 때마다
    // 무늬가 달라지면 안 되기 때문(렌더마다 난수를 쓰면 깜빡이는 것처럼 보인다).
    case "splatter": {
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
      return { backgroundColor: base, backgroundImage: `${LP_GROOVES}, ${splatter}`, ...flat };
    }

    // 마블 — 경계가 흐릿한 큰 얼룩 몇 장을 겹쳐 대리석 결처럼. 스월과 달리 회전 방향이 없다.
    case "marble": {
      const light = mix(base, 0.4);
      const dark = mix(base, -0.32);
      const clouds = [
        `radial-gradient(ellipse 70% 45% at 22% 30%, ${light} 0%, rgba(0,0,0,0) 60%)`,
        `radial-gradient(ellipse 60% 55% at 78% 62%, ${light} 0%, rgba(0,0,0,0) 62%)`,
        `radial-gradient(ellipse 55% 40% at 60% 18%, ${dark} 0%, rgba(0,0,0,0) 58%)`,
        `radial-gradient(ellipse 65% 50% at 30% 82%, ${dark} 0%, rgba(0,0,0,0) 60%)`,
      ].join(", ");
      return { backgroundColor: base, backgroundImage: `${LP_GROOVES}, ${clouds}`, ...flat };
    }

    // 스월 — 두 색이 중심을 축으로 돌아가며 섞인다. conic-gradient라 판의 회전과 결이 맞는다.
    case "swirl": {
      const light = mix(base, 0.38);
      const dark = mix(base, -0.35);
      return {
        backgroundColor: base,
        backgroundImage: `${LP_GROOVES}, conic-gradient(from 210deg at 50% 50%, ${dark}, ${light} 22%, ${dark} 45%, ${light} 68%, ${dark} 88%, ${dark})`,
        ...flat,
      };
    }

    // 픽쳐 디스크 — 커버가 판 면에 인쇄된다. 배경만으로는 불가능해서 컴포넌트가 이미지 레이어를
    // 깔도록 picture 플래그를 올린다. 커버가 없으면 자연히 단색 판으로 떨어진다.
    case "picture":
      return { backgroundColor: DEFAULT_COLOR, backgroundImage: LP_GROOVES, ...flat, picture: true };

    // 컬러(불투명) — 고른 색 그대로 + 홈
    default:
      return { backgroundColor: base, backgroundImage: LP_GROOVES, ...flat };
  }
}
