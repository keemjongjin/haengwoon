import { describe, it, expect } from "vitest";
import { expectedScore, updateElo, eloToScore10, DEFAULT_ELO } from "./elo";

describe("expectedScore", () => {
  it("동점이면 기대값 0.5", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });
  it("두 기대값의 합은 1", () => {
    expect(expectedScore(1600, 1400) + expectedScore(1400, 1600)).toBeCloseTo(1, 5);
  });
  it("높은 쪽이 더 높은 기대값", () => {
    expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5);
  });
});

describe("updateElo", () => {
  it("동점 대결 시 승자 +16 / 패자 -16 (K=32)", () => {
    const r = updateElo(1500, 1500);
    expect(r.winner).toBe(1516);
    expect(r.loser).toBe(1484);
  });
  it("승자는 오르고 패자는 내린다", () => {
    const r = updateElo(1600, 1400);
    expect(r.winner).toBeGreaterThan(1600);
    expect(r.loser).toBeLessThan(1400);
  });
  it("이변(약자 승리)일수록 변동 폭이 크다", () => {
    const upset = updateElo(1400, 1600); // 약자가 이김
    const expected = updateElo(1600, 1400); // 강자가 이김
    expect(upset.winner - 1400).toBeGreaterThan(expected.winner - 1600);
  });
});

describe("eloToScore10", () => {
  it("기본값 1500 → 8.3", () => {
    expect(eloToScore10(DEFAULT_ELO)).toBe(8.3);
  });
  it("10점을 넘지 않는다", () => {
    expect(eloToScore10(3000)).toBeLessThanOrEqual(10);
  });
});
