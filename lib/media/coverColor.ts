// 앨범 커버 이미지에서 "옆면(스파인)에 칠할 대표 색"을 뽑아낸다.
//
// 왜 서버가 아니라 브라우저에서 하나:
//  - 커버는 Spotify CDN 이미지라 서버에서 뽑으려면 매번 원본을 내려받아 디코딩해야 하고,
//    결과를 저장할 컬럼도 새로 필요하다. 진열대에 보이는 건 한 달에 최대 10장이라
//    클라이언트에서 32×32로 줄여 읽는 편이 훨씬 싸다.
//  - next/image 프록시(/_next/image)를 거치면 동일 출처가 되어 canvas가 오염(taint)되지 않는다.
//    원본 i.scdn.co URL을 그대로 <img>에 물리면 getImageData()가 SecurityError로 막힌다.
//
// 결과는 모듈 수준 Map에 Promise째로 캐시한다 — 캐러셀이 리렌더될 때마다 같은 커버를
// 다시 디코딩하지 않도록, 그리고 동시에 여러 카드가 같은 URL을 요청해도 한 번만 읽도록.

/** 스파인에 바로 꽂아 쓸 수 있는 배경색 + 그 위 글자색 한 쌍. */
export type CoverColor = {
  /** 스파인 바탕색 */
  spine: string;
  /** 바탕 위에 얹는 글자색 — 바탕 밝기에 따라 검정/흰색 계열로 갈린다 */
  ink: string;
};

const cache = new Map<string, Promise<CoverColor | null>>();

/** 표본 해상도. 대표색만 필요하므로 32×32면 충분하고, 이보다 크면 디코딩 비용만 늘어난다. */
const SAMPLE = 32;

/**
 * next/image 최적화 경로로 감싼 URL.
 * w는 next의 imageSizes 목록에 있는 값이어야 해서 64를 쓴다(임의 값은 400으로 거절됨).
 */
function proxied(url: string): string {
  return `/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`;
}

function toHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

/**
 * 픽셀 배열에서 대표색 하나를 고른다.
 *
 * 단순 평균을 쓰면 알록달록한 커버가 전부 회갈색으로 뭉개진다. 그래서 색을 굵게 양자화한
 * 바구니(채널당 16단계)에 나눠 담아 "가장 많이 등장한 색 덩어리"를 고르고, 그 안의 실제
 * 픽셀만 평균낸다. 다만 개수만 세면 커버 여백의 흰색/검정이 항상 이기므로,
 * 채도가 높을수록 가중치를 주고 거의 흰색·검정인 픽셀은 가중치를 깎는다.
 */
function pickDominant(data: Uint8ClampedArray): CoverColor {
  type Bin = { w: number; r: number; g: number; b: number; n: number };
  const bins = new Map<number, Bin>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] < 128) continue; // 투명 픽셀은 색으로 치지 않는다

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (max + min) / 2;
    // 무채색 여백(거의 흰색/검정)은 존재감이 커도 "이 앨범의 색"은 아니다
    const drab = lum < 26 || lum > 235 ? 0.12 : 1;
    const weight = (0.35 + sat * 2) * drab;

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key);
    if (bin) {
      bin.w += weight;
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.n += 1;
    } else {
      bins.set(key, { w: weight, r, g, b, n: 1 });
    }
  }

  let best: Bin | null = null;
  for (const bin of bins.values()) if (!best || bin.w > best.w) best = bin;

  // 표본이 통째로 투명한 예외적인 경우 — 종이 슬리브 기본색으로 되돌린다
  if (!best) return { spine: "hsl(40 8% 88%)", ink: "rgba(0,0,0,0.7)" };

  const [h, rawS, rawL] = toHsl(best.r / best.n, best.g / best.n, best.b / best.n);

  // 커버 색을 그대로 쓰면 형광색이나 새까만 스파인이 나온다. 실제 종이 슬리브가 그렇듯
  // 채도·명도를 살짝 눌러 "인쇄된 색" 범위로 가둔다 — 색상(h)만 커버에서 그대로 물려받는다.
  const s = Math.min(0.52, Math.max(0.08, rawS * 0.78));
  const l = Math.min(0.74, Math.max(0.22, rawL * 0.9 + 0.06));

  return {
    spine: hslToCss(h, s, l),
    // 밝은 스파인엔 검정, 어두운 스파인엔 흰색 — 어느 쪽이든 제목이 읽혀야 한다
    ink: l > 0.55 ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.85)",
  };
}

/**
 * 커버 URL에서 대표색을 뽑는다. 같은 URL은 한 번만 읽고 결과를 캐시한다.
 * 실패(네트워크·CORS·canvas 미지원)하면 null — 호출측이 기존 기본색으로 넘어가면 된다.
 */
export function coverColor(url: string): Promise<CoverColor | null> {
  const hit = cache.get(url);
  if (hit) return hit;

  const task = new Promise<CoverColor | null>((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        resolve(pickDominant(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = proxied(url);
  });

  cache.set(url, task);
  return task;
}
