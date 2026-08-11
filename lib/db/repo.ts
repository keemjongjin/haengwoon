import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "./index";
import { updateElo } from "@/lib/music/elo";
import { todayKST } from "@/lib/format";
import type { SpotifyAlbum } from "@/lib/integrations/spotify";

// Drizzle + Neon 기반 저장소. (구 인메모리 repo와 동일한 인터페이스, 이제 async)
// PLAN.md §4 스키마 / DECISIONS.log 참고.
// 이 파일의 모든 메서드는 단일 객체 `repo`의 프로퍼티로 export된다 — 라우트/서버 컴포넌트에서는
// 항상 `import { repo } from "@/lib/db/repo"; repo.xxx(...)` 형태로 쓴다.

export type AlbumRow = typeof schema.albums.$inferSelect;
export type TrackRow = typeof schema.tracks.$inferSelect;
export type MatchRow = typeof schema.matches.$inferSelect;
export type CommentRow = typeof schema.comments.$inferSelect;

function requireDb() {
  if (!db) throw new Error("DATABASE_URL이 설정되지 않았습니다.");
  return db;
}

// 최초 연결 시 albums 테이블이 비어있으면 데모 데이터로 1회 시드.
let seedPromise: Promise<void> | null = null;
function ensureSeeded(): Promise<void> {
  if (!seedPromise) seedPromise = seedIfEmpty();
  return seedPromise;
}

async function seedIfEmpty() {
  const dbc = requireDb();
  const existing = await dbc.select({ id: schema.albums.id }).from(schema.albums).limit(1);
  if (existing.length > 0) return;

  // [title, artist, elo, rating, reviewDate, releaseDate, genre, review, tracks]
  const raw = [
    ["Loveless", "My Bloody Valentine", 1712, 9.2, "2026-06-02", "1991-11-04", "Shoegaze",
      "노이즈의 벽 너머에 멜로디가 숨어있다.", ["Only Shallow", "Loomer", "Sometimes"]],
    ["In Rainbows", "Radiohead", 1688, 9.4, "2026-07-18", "2007-10-10", "Art Rock",
      "밴드가 가격을 팬에게 맡긴 실험작. 그런데 음악은 완성이었다.", ["15 Step", "Nude", "Reckoner"]],
    ["空中キャンプ", "Fishmans", 1655, 8.7, "2026-05-20", "1996-09-09", "Dub",
      "새벽 4시에만 열리는 문 같은 앨범.", ["ずっと前", "エヴリデイ・エヴリナイト", "幸せ者"]],
    ["Currents", "Tame Impala", 1602, 8.0, "2026-07-10", "2015-07-17", "Psych",
      "혼자 다 만든 사람의 고독이 신스 위에 얹혀있다.", ["Let It Happen", "The Less I Know", "New Person"]],
  ] as const;

  for (let i = 0; i < raw.length; i++) {
    const [title, artist, elo, rating, reviewDate, releaseDate, genre, review, tracks] = raw[i];
    const [album] = await dbc
      .insert(schema.albums)
      .values({
        spotifyAlbumId: `seed-${i + 1}`,
        title,
        artist,
        releaseDate,
        reviewDate,
        genre,
        review,
        manualRating: rating,
        eloRating: elo,
      })
      .returning();
    await dbc.insert(schema.tracks).values(
      tracks.map((t, j) => ({
        albumId: album.id,
        title: t,
        trackNumber: j + 1,
        isFavorite: j === 0,
      }))
    );
  }
}

// 모든 메서드가 DB 접근 전에 이걸 거친다 — 연결 존재 확인(requireDb) + 최초 1회 시드(ensureSeeded)를 보장.
async function withDb() {
  await ensureSeeded();
  return requireDb();
}

export const repo = {
  /** 전체 앨범 (정렬 없음 — 정렬이 필요한 화면은 각자 필요한 순서로 다시 정렬해서 씀). */
  async listAlbums(): Promise<AlbumRow[]> {
    const dbc = await withDb();
    return dbc.select().from(schema.albums);
  },

  /** 내부 숫자 ID로 앨범 한 건 조회. */
  async getAlbum(id: number): Promise<AlbumRow | undefined> {
    const dbc = await withDb();
    const rows = await dbc.select().from(schema.albums).where(eq(schema.albums.id, id));
    return rows[0];
  },

  /** Spotify 앨범 ID로 조회 — 상세페이지 URL에 내부 숫자ID 대신 이 값을 사용 */
  async getAlbumBySpotifyId(spotifyAlbumId: string): Promise<AlbumRow | undefined> {
    const dbc = await withDb();
    const rows = await dbc
      .select()
      .from(schema.albums)
      .where(eq(schema.albums.spotifyAlbumId, spotifyAlbumId));
    return rows[0];
  },

  /** 아티스트명 정확일치로 앨범 그룹화 (앨범 등록 시 자동으로 반영됨, 별도 관리 불필요) */
  async getAlbumsByArtist(artist: string): Promise<AlbumRow[]> {
    const dbc = await withDb();
    return dbc.select().from(schema.albums).where(eq(schema.albums.artist, artist));
  },

  /** 전체 트랙 (검색 인덱스 등에서 사용) */
  async listAllTracks(): Promise<TrackRow[]> {
    const dbc = await withDb();
    return dbc.select().from(schema.tracks);
  },

  /** 앨범 상세 페이지용 — 앨범 정보 + 수록곡 전체(트랙 번호순)를 한 번에 반환. 없으면 null. */
  async getAlbumWithTracks(id: number) {
    const dbc = await withDb();
    const album = await this.getAlbum(id);
    if (!album) return null;
    const tracks = await dbc
      .select()
      .from(schema.tracks)
      .where(eq(schema.tracks.albumId, id))
      .orderBy(schema.tracks.trackNumber);
    return { album, tracks };
  },

  /**
   * Spotify에서 가져온 앨범 메타를 등록(관리자 검색·등록 플로우). 이미 같은 spotifyAlbumId가
   * 있으면 새로 만들지 않고 기존 행을 그대로 반환(중복 등록 방지). 리뷰일은 오늘(KST) 자동 지정.
   * 트랙의 미리듣기(previewUrl)는 여기서 채우지 않는다 — 등록 후 별도 backfill 라우트가 담당.
   */
  async addAlbumFromSpotify(album: SpotifyAlbum): Promise<AlbumRow> {
    const dbc = await withDb();
    const existing = await dbc
      .select()
      .from(schema.albums)
      .where(eq(schema.albums.spotifyAlbumId, album.spotifyAlbumId));
    if (existing[0]) return existing[0];

    const [row] = await dbc
      .insert(schema.albums)
      .values({
        spotifyAlbumId: album.spotifyAlbumId,
        title: album.title,
        artist: album.artist,
        coverImageUrl: album.coverImageUrl,
        releaseDate: album.releaseDate,
        reviewDate: todayKST(),
        genre: album.genre ?? null,
        albumType: album.albumType ?? "album",
      })
      .returning();

    if (album.tracks.length > 0) {
      await dbc.insert(schema.tracks).values(
        album.tracks.map((t) => ({
          albumId: row.id,
          spotifyTrackId: t.spotifyTrackId,
          title: t.title,
          trackNumber: t.trackNumber,
          durationMs: t.durationMs ?? null,
          previewUrl: t.previewUrl ?? null,
        }))
      );
    }
    return row;
  },

  /** rating이 null이거나 0이면 평점 해제(미평가 상태로) — 0점은 사실상 "안 매김"과 구분할 의미가 없어 통일 */
  async setManualRating(id: number, rating: number | null): Promise<AlbumRow | undefined> {
    const dbc = await withDb();
    const clamped = !rating ? null : Math.max(0, Math.min(10, rating));
    const [row] = await dbc
      .update(schema.albums)
      .set({ manualRating: clamped })
      .where(eq(schema.albums.id, id))
      .returning();
    return row;
  },

  /** 앨범 리뷰 한 줄 저장. 빈 문자열이면 null로 정리(리뷰 없음 상태). */
  async setReview(id: number, review: string): Promise<AlbumRow | undefined> {
    const dbc = await withDb();
    const [row] = await dbc
      .update(schema.albums)
      .set({ review: review || null })
      .where(eq(schema.albums.id, id))
      .returning();
    return row;
  },

  /** 관리자: 앨범 기본 정보 수정(제목/아티스트/장르) */
  async updateAlbumMeta(
    id: number,
    data: {
      title?: string;
      artist?: string;
      genre?: string | null;
      lpColor?: string | null;
      lpPattern?: string | null;
    }
  ): Promise<AlbumRow | undefined> {
    const dbc = await withDb();
    const [row] = await dbc.update(schema.albums).set(data).where(eq(schema.albums.id, id)).returning();
    return row;
  },

  /** 관리자: 앨범 삭제(수록곡·투표기록도 cascade) */
  async deleteAlbum(id: number): Promise<boolean> {
    const dbc = await withDb();
    const result = await dbc.delete(schema.albums).where(eq(schema.albums.id, id)).returning();
    return result.length > 0;
  },

  /** 앨범당 최애곡은 항상 1곡 — 새로 지정 시 같은 앨범의 기존 최애는 자동 해제 */
  async toggleFavorite(trackId: number): Promise<TrackRow | undefined> {
    const dbc = await withDb();
    const rows = await dbc.select().from(schema.tracks).where(eq(schema.tracks.id, trackId));
    const t = rows[0];
    if (!t) return undefined;

    if (t.isFavorite) {
      const [row] = await dbc
        .update(schema.tracks)
        .set({ isFavorite: false })
        .where(eq(schema.tracks.id, trackId))
        .returning();
      return row;
    }

    await dbc.update(schema.tracks).set({ isFavorite: false }).where(eq(schema.tracks.albumId, t.albumId));
    const [row] = await dbc
      .update(schema.tracks)
      .set({ isFavorite: true })
      .where(eq(schema.tracks.id, trackId))
      .returning();
    return row;
  },

  /** 관리자: 곡별 평점(0=그냥 그럼, 1=좋음, 2=개좋음) 설정. null은 미평가 상태로 되돌림 */
  async setTrackRating(trackId: number, tier: number | null): Promise<TrackRow | undefined> {
    const dbc = await withDb();
    const clamped = tier == null ? null : Math.max(0, Math.min(2, Math.round(tier)));
    const [row] = await dbc
      .update(schema.tracks)
      .set({ manualRating: clamped })
      .where(eq(schema.tracks.id, trackId))
      .returning();
    return row;
  },

  /** 관리자: 곡별 코멘트 설정 */
  async setTrackComment(trackId: number, comment: string): Promise<TrackRow | undefined> {
    const dbc = await withDb();
    const [row] = await dbc
      .update(schema.tracks)
      .set({ comment: comment.trim() || null })
      .where(eq(schema.tracks.id, trackId))
      .returning();
    return row;
  },

  /** 미리듣기 백필/수동 지정용 — previewUrl에 Deezer 프록시 경로(/api/deezer-preview/{id})를 저장 */
  async setTrackPreviewUrl(trackId: number, previewUrl: string | null): Promise<TrackRow | undefined> {
    const dbc = await withDb();
    const [row] = await dbc
      .update(schema.tracks)
      .set({ previewUrl })
      .where(eq(schema.tracks.id, trackId))
      .returning();
    return row;
  },

  /** 앨범별 최애곡 일괄 조회 (앨범당 최대 1곡 가정) */
  async listFavoriteTracks(): Promise<Record<number, TrackRow>> {
    const dbc = await withDb();
    const rows = await dbc.select().from(schema.tracks).where(eq(schema.tracks.isFavorite, true));
    return Object.fromEntries(rows.map((t) => [t.albumId, t]));
  },

  /** 앨범 월드컵용 랜덤 대진 두 장 뽑기. 등록된 앨범이 2장 미만이면 null. */
  async getMatchup(): Promise<[AlbumRow, AlbumRow] | null> {
    const albums = await this.listAlbums();
    if (albums.length < 2) return null;
    const pool = [...albums];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    return [a, b];
  },

  /** 월드컵 투표 반영 — lib/music/elo.ts로 두 앨범의 Elo를 갱신하고 matches에 로그를 남긴다. */
  async vote(
    winnerId: number,
    loserId: number
  ): Promise<{ winner: AlbumRow; loser: AlbumRow } | null> {
    if (winnerId === loserId) return null;
    const dbc = await withDb();
    const winner = await this.getAlbum(winnerId);
    const loser = await this.getAlbum(loserId);
    if (!winner || !loser) return null;

    const next = updateElo(winner.eloRating, loser.eloRating);
    const [newWinner] = await dbc
      .update(schema.albums)
      .set({ eloRating: next.winner, matchCount: winner.matchCount + 1 })
      .where(eq(schema.albums.id, winnerId))
      .returning();
    const [newLoser] = await dbc
      .update(schema.albums)
      .set({ eloRating: next.loser, matchCount: loser.matchCount + 1 })
      .where(eq(schema.albums.id, loserId))
      .returning();
    await dbc.insert(schema.matches).values({ albumAId: winnerId, albumBId: loserId, winnerId });

    return { winner: newWinner, loser: newLoser };
  },

  // --- 댓글 (익명, Music 전용) ---
  /** 공개용 — 숨김 처리된 댓글은 제외하고 최신순으로 반환. */
  async listComments(targetType: string, targetId: number): Promise<CommentRow[]> {
    const dbc = await withDb();
    return dbc
      .select()
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.targetType, targetType),
          eq(schema.comments.targetId, targetId),
          eq(schema.comments.isHidden, false)
        )
      )
      .orderBy(desc(schema.comments.createdAt));
  },

  /** 댓글 작성 — passwordHash는 호출측(API 라우트)에서 lib/security/hash.ts로 미리 해시해 넘긴다. */
  async addComment(data: {
    targetType: string;
    targetId: number;
    authorName: string;
    passwordHash: string;
    content: string;
  }): Promise<CommentRow> {
    const dbc = await withDb();
    const [row] = await dbc.insert(schema.comments).values(data).returning();
    return row;
  },

  /** 작성자 본인 삭제 — 비밀번호 해시가 일치하는 행만 지워진다(불일치 시 false, 아무것도 안 지워짐). */
  async deleteComment(id: number, passwordHash: string): Promise<boolean> {
    const dbc = await withDb();
    const result = await dbc
      .delete(schema.comments)
      .where(and(eq(schema.comments.id, id), eq(schema.comments.passwordHash, passwordHash)))
      .returning();
    return result.length > 0;
  },

  /** 관리자 전용: 전체 댓글(숨김 포함) 최신순 */
  async listAllComments(limit = 100): Promise<CommentRow[]> {
    const dbc = await withDb();
    return dbc.select().from(schema.comments).orderBy(desc(schema.comments.createdAt)).limit(limit);
  },

  /** 관리자 전용: 비밀번호 없이 강제 삭제 */
  async adminDeleteComment(id: number): Promise<boolean> {
    const dbc = await withDb();
    const result = await dbc.delete(schema.comments).where(eq(schema.comments.id, id)).returning();
    return result.length > 0;
  },

  async setCommentHidden(id: number, isHidden: boolean): Promise<CommentRow | undefined> {
    const dbc = await withDb();
    const [row] = await dbc
      .update(schema.comments)
      .set({ isHidden })
      .where(eq(schema.comments.id, id))
      .returning();
    return row;
  },

  // --- 좋아요 (IP당 1회로 제한) ---
  /** 특정 대상(앨범/글)의 좋아요 총 개수. */
  async getLikes(targetType: string, targetId: number): Promise<number> {
    const dbc = await withDb();
    const rows = await dbc
      .select({ count: count() })
      .from(schema.likeEvents)
      .where(and(eq(schema.likeEvents.targetType, targetType), eq(schema.likeEvents.targetId, targetId)));
    return rows[0]?.count ?? 0;
  },

  /** 이 IP가 이미 좋아요를 눌렀는지 (버튼 상태 표시용) */
  async hasLiked(targetType: string, targetId: number, ip: string): Promise<boolean> {
    const dbc = await withDb();
    const rows = await dbc
      .select({ id: schema.likeEvents.id })
      .from(schema.likeEvents)
      .where(
        and(
          eq(schema.likeEvents.targetType, targetType),
          eq(schema.likeEvents.targetId, targetId),
          eq(schema.likeEvents.ip, ip)
        )
      )
      .limit(1);
    return rows.length > 0;
  },

  /** 여러 앨범의 좋아요 수 일괄 조회 — Archive 좋아요순 정렬용 (N+1 방지) */
  async getLikeCountsFor(targetType: string, targetIds: number[]): Promise<Record<number, number>> {
    if (targetIds.length === 0) return {};
    const dbc = await withDb();
    const rows = await dbc
      .select({ targetId: schema.likeEvents.targetId, count: count() })
      .from(schema.likeEvents)
      .where(and(eq(schema.likeEvents.targetType, targetType), inArray(schema.likeEvents.targetId, targetIds)))
      .groupBy(schema.likeEvents.targetId);
    return Object.fromEntries(rows.map((r) => [r.targetId, r.count]));
  },

  /** IP 기준 좋아요 토글 — 이미 눌렀으면 취소(삭제), 아니면 추가 */
  async toggleLike(
    targetType: string,
    targetId: number,
    ip: string
  ): Promise<{ count: number; liked: boolean }> {
    const dbc = await withDb();
    const already = await this.hasLiked(targetType, targetId, ip);
    if (already) {
      await dbc
        .delete(schema.likeEvents)
        .where(
          and(
            eq(schema.likeEvents.targetType, targetType),
            eq(schema.likeEvents.targetId, targetId),
            eq(schema.likeEvents.ip, ip)
          )
        );
    } else {
      try {
        await dbc.insert(schema.likeEvents).values({ targetType, targetId, ip });
      } catch {
        // 동시요청 등으로 유니크 제약 위반 시 이미 좋아요 누른 것으로 처리
      }
    }
    const count = await this.getLikes(targetType, targetId);
    return { count, liked: !already };
  },

  // --- 블로그 글 노출 여부 (콘텐츠는 git, 이 테이블은 show/hide 오버레이만) ---
  /** 숨김 처리된 글의 slug 집합 — lib/content/posts.ts의 getVisiblePosts()가 필터링에 사용. */
  async getHiddenSlugs(): Promise<Set<string>> {
    const dbc = await withDb();
    const rows = await dbc
      .select({ slug: schema.postVisibility.slug })
      .from(schema.postVisibility)
      .where(eq(schema.postVisibility.hidden, true));
    return new Set(rows.map((r) => r.slug));
  },

  /** 관리자: 글 하나의 노출/숨김 토글. 행이 없으면 새로 만들고, 있으면 upsert로 갱신. */
  async setPostHidden(slug: string, hidden: boolean): Promise<void> {
    const dbc = await withDb();
    await dbc
      .insert(schema.postVisibility)
      .values({ slug, hidden })
      .onConflictDoUpdate({ target: schema.postVisibility.slug, set: { hidden } });
  },

  // --- 스토리 공유 카드용 프로필 (싱글턴) ---
  /** 공유 카드에 쓰는 프로필(표시 이름 + 사진). 아직 설정 전이면 기본값("Haengwoon")으로 폴백. */
  async getProfile(): Promise<{ displayName: string; photoUrl: string | null }> {
    const dbc = await withDb();
    const rows = await dbc.select().from(schema.profile).where(eq(schema.profile.id, 1));
    return rows[0] ?? { displayName: "Haengwoon", photoUrl: null };
  },

  /** 관리자: 프로필 upsert. id=1 고정이라 프로필은 항상 한 행만 존재(싱글턴). */
  async setProfile(data: { displayName: string; photoUrl: string | null }): Promise<void> {
    const dbc = await withDb();
    await dbc
      .insert(schema.profile)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({ target: schema.profile.id, set: data });
  },

  // --- 월간 추천 앨범 (/music 홈 LP 캐러셀) ---
  /**
   * 특정 월(예: "2026-08")의 추천 앨범을 position 순서대로 반환. 추천이 없으면 빈 배열.
   * monthly_picks와 albums를 조인해 앨범 정보를 통째로 넘긴다(화면에서 커버·제목·평점 전부 필요).
   */
  async listMonthlyPicks(yearMonth: string): Promise<AlbumRow[]> {
    const dbc = await withDb();
    const rows = await dbc
      .select({ album: schema.albums })
      .from(schema.monthlyPicks)
      .innerJoin(schema.albums, eq(schema.monthlyPicks.albumId, schema.albums.id))
      .where(eq(schema.monthlyPicks.yearMonth, yearMonth))
      .orderBy(asc(schema.monthlyPicks.position));
    return rows.map((r) => r.album);
  },

  /**
   * 추천이 하나라도 등록된 월 목록(최신순). 화면의 이전/다음 달 화살표는 이 목록 안에서만
   * 이동하게 해서, 데이터가 없는 빈 달로 무한히 넘어가지 않도록 한다.
   */
  async listPickMonths(): Promise<string[]> {
    const dbc = await withDb();
    const rows = await dbc
      .selectDistinct({ yearMonth: schema.monthlyPicks.yearMonth })
      .from(schema.monthlyPicks)
      .orderBy(desc(schema.monthlyPicks.yearMonth));
    return rows.map((r) => r.yearMonth);
  },

  /**
   * 여태 월간 추천에 한 번이라도 올린 앨범 전체(중복 제거). Music 홈 히어로 아래에 깔리는
   * 커버 그리드용. 같은 앨범이 여러 달에 들어가 있을 수 있어 selectDistinct로 한 장만 남긴다.
   * 정렬은 아티스트 이름순 — 그 다음 제목순으로 묶어 같은 아티스트 앨범이 나란히 오게 한다.
   */
  async listAllPickedAlbums(): Promise<AlbumRow[]> {
    const dbc = await withDb();
    const rows = await dbc
      .selectDistinct({ album: schema.albums })
      .from(schema.monthlyPicks)
      .innerJoin(schema.albums, eq(schema.monthlyPicks.albumId, schema.albums.id))
      .orderBy(asc(schema.albums.artist), asc(schema.albums.title));

    // 앨범 id로 한 번 더 걸러낸다. selectDistinct는 "선택한 컬럼 전부가 같은 행"을 지우는 것이라,
    // 지금은 albums 컬럼만 고르고 있어 의도대로 동작하지만 — 나중에 여기에 monthly_picks의
    // 컬럼(예: year_month)을 하나라도 더 얹는 순간 DISTINCT가 조용히 무력해져 같은 앨범이
    // 달 수만큼 중복으로 깔린다. 월간 추천은 여러 달에 같은 앨범을 넣을 수 있으니 실제로 터진다.
    const seen = new Set<number>();
    return rows.map((r) => r.album).filter((a) => !seen.has(a.id) && seen.add(a.id));
  },

  /**
   * 관리자: 해당 월의 추천 목록을 통째로 교체(기존 행 삭제 후 재삽입). 부분 수정 대신 전체 교체라
   * 순서 재배열·삭제·추가를 한 번의 저장으로 처리할 수 있다. albumIds 배열 순서가 곧 position(1부터).
   * 최대 10장까지만 반영하고 초과분은 잘라낸다.
   */
  async setMonthlyPicks(yearMonth: string, albumIds: number[]): Promise<void> {
    const dbc = await withDb();
    const limited = albumIds.slice(0, 10);
    await dbc.delete(schema.monthlyPicks).where(eq(schema.monthlyPicks.yearMonth, yearMonth));
    if (limited.length === 0) return;
    await dbc.insert(schema.monthlyPicks).values(
      limited.map((albumId, i) => ({ yearMonth, albumId, position: i + 1 }))
    );
  },

  /** 관리자 백업 다운로드용 — 모든 테이블 전체 덤프(JSON). */
  async exportAll() {
    const dbc = await withDb();
    const [albums, tracks, matches, comments, likeEvents] = await Promise.all([
      dbc.select().from(schema.albums),
      dbc.select().from(schema.tracks),
      dbc.select().from(schema.matches),
      dbc.select().from(schema.comments),
      dbc.select().from(schema.likeEvents),
    ]);
    return { albums, tracks, matches, comments, likeEvents };
  },

  // --- 관리자 개요용 요약 통계 (블로그 글 수는 파일 기반이라 여기 포함 안 함, lib/content/posts.ts 참고) ---
  /** 관리자 대시보드 상단 숫자 카드용 — 앨범/트랙/댓글/투표 총 개수. */
  async getSummaryCounts() {
    const dbc = await withDb();
    const [albums, tracks, comments, matches] = await Promise.all([
      dbc.select({ count: count() }).from(schema.albums),
      dbc.select({ count: count() }).from(schema.tracks),
      dbc.select({ count: count() }).from(schema.comments),
      dbc.select({ count: count() }).from(schema.matches),
    ]);
    return {
      albums: albums[0]?.count ?? 0,
      tracks: tracks[0]?.count ?? 0,
      comments: comments[0]?.count ?? 0,
      matches: matches[0]?.count ?? 0,
    };
  },

  /** 최근 활동: 최근 댓글 N개 + 최근 투표 N개 */
  async getRecentActivity(limit = 5) {
    const dbc = await withDb();
    const [comments, matches] = await Promise.all([
      dbc.select().from(schema.comments).orderBy(desc(schema.comments.createdAt)).limit(limit),
      dbc.select().from(schema.matches).orderBy(desc(schema.matches.createdAt)).limit(limit),
    ]);
    return { comments, matches };
  },

  // --- 방문자 카운터 (자체 집계) ---
  /** 페이지 로드 시 호출 — 경로 하나에 방문 기록 한 행 추가(집계는 getVisitStats에서). */
  async recordVisit(path: string) {
    const dbc = await withDb();
    await dbc.insert(schema.visits).values({ path });
  },

  /** 관리자 대시보드용 — 오늘/이번주/전체 방문 수 + 가장 많이 본 경로 상위 5개. */
  async getVisitStats() {
    const dbc = await withDb();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalRow, todayRow, weekRow, top] = await Promise.all([
      dbc.select({ count: count() }).from(schema.visits),
      dbc.select({ count: count() }).from(schema.visits).where(gte(schema.visits.createdAt, todayStart)),
      dbc.select({ count: count() }).from(schema.visits).where(gte(schema.visits.createdAt, weekStart)),
      dbc
        .select({ path: schema.visits.path, count: count() })
        .from(schema.visits)
        .groupBy(schema.visits.path)
        .orderBy(desc(count()))
        .limit(5),
    ]);

    return {
      today: todayRow[0]?.count ?? 0,
      week: weekRow[0]?.count ?? 0,
      total: totalRow[0]?.count ?? 0,
      topPaths: top,
    };
  },
};
