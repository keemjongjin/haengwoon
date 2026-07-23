"use client";

const TIER_LABELS = ["그냥 그럼", "좋음", "개좋음"];

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}

// 곡 평점을 채워진 별의 개수로만 표시 (0=별 없음, 1=좋음, 2=개좋음) — 빈 별 윤곽선은 그리지 않음.
// 최애곡이면 초록, 아니면 회색. onChange를 넘기면 클릭으로 바로 저장(관리자용, 0점일 때도
// 클릭할 자리는 옅게 남겨둠), 없으면 읽기 전용(공개 화면용, 0점이면 아예 렌더링하지 않음).
export function TrackTierStars({
  tier,
  isFavorite,
  onChange,
}: {
  tier: number | null;
  isFavorite: boolean;
  onChange?: (tier: number) => void;
}) {
  const value = tier ?? 0;
  const colorClass = isFavorite ? "text-acc" : "text-mut/60";

  if (!onChange) {
    if (value === 0) return null;
    return (
      <span className={"inline-flex items-center gap-[1px] " + colorClass} title={TIER_LABELS[value]}>
        {Array.from({ length: value }, (_, i) => (
          <StarIcon key={i} />
        ))}
      </span>
    );
  }

  return (
    <span
      className={"inline-flex items-center gap-[1px] " + colorClass}
      title={TIER_LABELS[value]}
      aria-label={isFavorite ? `최애곡 · ${TIER_LABELS[value]}` : TIER_LABELS[value]}
    >
      {[1, 2].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(value === i ? i - 1 : i)}
          aria-label={`${TIER_LABELS[i]} (${i}점)`}
          className={"transition-opacity hover:opacity-70 " + (value >= i ? "opacity-100" : "opacity-20")}
        >
          <StarIcon />
        </button>
      ))}
    </span>
  );
}
