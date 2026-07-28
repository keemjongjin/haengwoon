// Elo 레이팅 엔진. 앨범 월드컵(app/api/match/vote) 맞대결 결과로 albums.eloRating을 재계산한다.
// 관리자가 직접 매기는 manualRating(0~10)과는 완전히 별개 지표 — "취향 대결" 순위용.
// PLAN.md §5.1 / DECISIONS.log 참고.

/** 새로 등록된 앨범의 초기 Elo 점수. */
export const DEFAULT_ELO = 1500;
/** 한 판 대결로 점수가 최대 얼마나 흔들릴 수 있는지(K-factor). 클수록 변동폭이 큼. */
export const DEFAULT_K = 32;

/** A가 B를 이길 기대 확률 (0~1) */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/** 승자/패자의 새 Elo 점수를 반환 (정수 반올림) */
export function updateElo(
  winner: number,
  loser: number,
  k: number = DEFAULT_K
): { winner: number; loser: number } {
  const expWin = expectedScore(winner, loser);
  const expLose = expectedScore(loser, winner);
  return {
    winner: Math.round(winner + k * (1 - expWin)),
    loser: Math.round(loser + k * (0 - expLose)),
  };
}

/** Elo → 화면 표시용 10점 만점 환산 (소수점 1자리). 불일치 지표/참고용. */
export function eloToScore10(elo: number): number {
  return Math.round(Math.min(10, elo / 180) * 10) / 10;
}
