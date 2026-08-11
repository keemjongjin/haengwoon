import { repo } from "@/lib/db/repo";
import { todayKST } from "@/lib/format";
import { MonthlyPicks } from "@/components/music/MonthlyPicks";

export const metadata = { title: "Music — Haengwoon" };
export const dynamic = "force-dynamic"; // DB 데이터 매 요청 최신화 (추천 변경 즉시 반영)

// Music 홈은 "이 달의 LP를 넘겨보고 듣는" 한 가지 일에만 집중한다.
// 최근 리뷰 목록·차트 같은 탐색은 Archive/Charts 페이지가 담당하므로 여기서는 두지 않는다.
export default async function MusicHome() {
  // 기본은 이번 달(KST 기준 — UTC로 계산하면 자정~오전 9시에 지난달이 뜬다). 이번 달 추천이 아직
  // 없으면 추천이 등록된 가장 최근 달로 자동 이동시켜, 첫 화면이 비는 상황을 피한다.
  const pickMonths = await repo.listPickMonths();
  const thisMonth = todayKST().slice(0, 7);
  const shownMonth = pickMonths.includes(thisMonth) ? thisMonth : pickMonths[0] ?? thisMonth;

  const picks = await repo.listMonthlyPicks(shownMonth);
  const pickAlbums = picks.map((a) => ({
    id: a.id,
    spotifyAlbumId: a.spotifyAlbumId,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
  }));

  // 히어로 아래 그리드 — 여태 추천에 올린 앨범 전체(아티스트 이름순).
  const allPicked = (await repo.listAllPickedAlbums()).map((a) => ({
    id: a.id,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
  }));

  // 히어로의 전체 폭 확장과 그 아래 그리드 배치는 MonthlyPicks 안에서 처리한다 —
  // 플레이어를 열면 둘 다 사라져야 해서, 한 컴포넌트가 같이 쥐고 있어야 분기가 단순하다.
  return (
    <MonthlyPicks
      initialYearMonth={shownMonth}
      initialAlbums={pickAlbums}
      initialMonths={pickMonths}
      allPicked={allPicked}
    />
  );
}
