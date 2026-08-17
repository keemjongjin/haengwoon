import { ratingColor } from "@/lib/music/rating";

/**
 * 평점을 원형 프로그레스 링으로 표시. 점수만큼 링이 채워지고, 색은 평점 구간
 * (빨강/주황/초록, lib/music/rating.ts)을 따른다. 레퍼런스(Beli류 평점 카드) 스타일.
 *
 * Archive/Charts/Search/artist가 전부 이걸 쓴다 — 예전에 Charts만 "테두리 색만 바뀌는 원"으로
 * 따로 그렸다가 같은 평점인데 화면마다 다르게 보이는 문제가 있었다. 링은 여기 하나만 고친다.
 *
 * `size`로 지름(px)만 조절 — 링 두께·글자 크기는 지름에 비례해 자동으로 맞춘다.
 */
export function RatingRing({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = size * 0.071; // 56px일 때 4px — 기존 카드와 같은 비율
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 10));
  const color = ratingColor(value);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ color, fontSize: size * 0.25 }}
      >
        {value.toFixed(1)}
      </div>
    </div>
  );
}
