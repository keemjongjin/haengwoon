// 평점(0~10) 색상 밴드 — 숫자와 원형 그래프에 공통 적용.
// 0~5 빨강 / 5~7.5 주황 / 7.5~10 초록.
export function ratingColor(value: number): string {
  if (value < 5) return "#ef4444"; // red-500
  if (value < 7.5) return "#eab308"; // yellow-500
  return "#22c55e"; // green-500
}
