// 앨범 평점(albums.manualRating, 0~10)을 색으로 표시할 때 쓰는 공통 색상 밴드.
// 곡 평점(0=그냥 그럼/1=좋음/2=개좋음)은 별도 체계라 이 파일과 무관 —
// components/music/track/TrackTierStars.tsx가 그쪽을 담당한다.

/** 0~10 평점을 구간별 색상 코드로 변환. 0~5 빨강 / 5~7.5 주황 / 7.5~10 초록. */
export function ratingColor(value: number): string {
  if (value < 5) return "#ef4444"; // red-500
  if (value < 7.5) return "#eab308"; // yellow-500
  return "#22c55e"; // green-500
}
