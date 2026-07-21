import { updateElo, DEFAULT_ELO } from "@/lib/elo";
import type { SpotifyAlbum } from "@/lib/spotify";

// 뼈대(skeleton) 단계용 인메모리 저장소.
// DATABASE_URL 연결 후 Drizzle 구현으로 교체 예정(같은 인터페이스 유지).
// HMR 사이에도 유지되도록 globalThis에 보관.

export type AlbumRow = {
  id: number;
  spotifyAlbumId: string;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  releaseDate: string | null;
  reviewDate: string | null;
  genre: string | null;
  review: string | null;
  manualRating: number | null; // 0~10, 내가 지정 = 공식 점수
  eloRating: number;
  matchCount: number;
};

export type TrackRow = {
  id: number;
  albumId: number;
  title: string;
  trackNumber: number;
  isFavorite: boolean;
  eloRating: number;
};

export type MatchRow = {
  id: number;
  albumAId: number;
  albumBId: number;
  winnerId: number;
  createdAt: string;
};

export type CommentRow = {
  id: number;
  targetType: string; // 'album'
  targetId: number;
  authorName: string;
  passwordHash: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
};

export type LikeRow = { targetType: string; targetId: number; count: number };

type Store = {
  albums: AlbumRow[];
  tracks: TrackRow[];
  matches: MatchRow[];
  comments: CommentRow[];
  likes: LikeRow[];
  nextAlbumId: number;
  nextTrackId: number;
  nextMatchId: number;
  nextCommentId: number;
};

function seed(): Store {
  // [title, artist, elo, rating, reviewDate, releaseDate, genre, review, tracks]
  const raw: [string, string, number, number, string, string, string, string, string[]][] = [
    ["Loveless", "My Bloody Valentine", 1712, 9.2, "2026-06-02", "1991-11-04", "Shoegaze",
      "노이즈의 벽 너머에 멜로디가 숨어있다.", ["Only Shallow", "Loomer", "Sometimes"]],
    ["In Rainbows", "Radiohead", 1688, 9.4, "2026-07-18", "2007-10-10", "Art Rock",
      "밴드가 가격을 팬에게 맡긴 실험작. 그런데 음악은 완성이었다.", ["15 Step", "Nude", "Reckoner"]],
    ["空中キャンプ", "Fishmans", 1655, 8.7, "2026-05-20", "1996-09-09", "Dub",
      "새벽 4시에만 열리는 문 같은 앨범.", ["ずっと前", "エヴリデイ・エヴリナイト", "幸せ者"]],
    ["Currents", "Tame Impala", 1602, 8.0, "2026-07-10", "2015-07-17", "Psych",
      "혼자 다 만든 사람의 고독이 신스 위에 얹혀있다.", ["Let It Happen", "The Less I Know", "New Person"]],
  ];
  const albums: AlbumRow[] = [];
  const tracks: TrackRow[] = [];
  let trackId = 1;
  raw.forEach((a, i) => {
    const albumId = i + 1;
    albums.push({
      id: albumId,
      spotifyAlbumId: `seed-${albumId}`,
      title: a[0],
      artist: a[1],
      coverImageUrl: null,
      releaseDate: a[5],
      reviewDate: a[4],
      genre: a[6],
      review: a[7],
      manualRating: a[3],
      eloRating: a[2],
      matchCount: 0,
    });
    a[8].forEach((t, j) =>
      tracks.push({
        id: trackId++,
        albumId,
        title: t,
        trackNumber: j + 1,
        isFavorite: j === 0,
        eloRating: DEFAULT_ELO,
      })
    );
  });
  return {
    albums,
    tracks,
    matches: [],
    comments: [],
    likes: [],
    nextAlbumId: albums.length + 1,
    nextTrackId: trackId,
    nextMatchId: 1,
    nextCommentId: 1,
  };
}

const g = globalThis as unknown as { __repo?: Store };
const store: Store = (g.__repo ??= seed());

export const repo = {
  listAlbums(): AlbumRow[] {
    return [...store.albums];
  },

  getAlbum(id: number): AlbumRow | undefined {
    return store.albums.find((a) => a.id === id);
  },

  getAlbumWithTracks(id: number) {
    const album = this.getAlbum(id);
    if (!album) return null;
    const tracks = store.tracks
      .filter((t) => t.albumId === id)
      .sort((a, b) => a.trackNumber - b.trackNumber);
    return { album, tracks };
  },

  /** 가장 최근 리뷰(평점 있는) 앨범 */
  recentReview(): AlbumRow | undefined {
    return store.albums
      .filter((a) => a.manualRating != null && a.reviewDate)
      .sort((a, b) => (a.reviewDate! < b.reviewDate! ? 1 : -1))[0];
  },

  addAlbumFromSpotify(album: SpotifyAlbum): AlbumRow {
    const existing = store.albums.find((a) => a.spotifyAlbumId === album.spotifyAlbumId);
    if (existing) return existing;
    const row: AlbumRow = {
      id: store.nextAlbumId++,
      spotifyAlbumId: album.spotifyAlbumId,
      title: album.title,
      artist: album.artist,
      coverImageUrl: album.coverImageUrl,
      releaseDate: album.releaseDate,
      reviewDate: new Date().toISOString().slice(0, 10),
      genre: album.genre ?? null,
      review: null,
      manualRating: null,
      eloRating: DEFAULT_ELO,
      matchCount: 0,
    };
    store.albums.push(row);
    album.tracks.forEach((t) =>
      store.tracks.push({
        id: store.nextTrackId++,
        albumId: row.id,
        title: t.title,
        trackNumber: t.trackNumber,
        isFavorite: false,
        eloRating: DEFAULT_ELO,
      })
    );
    return row;
  },

  setManualRating(id: number, rating: number): AlbumRow | undefined {
    const a = this.getAlbum(id);
    if (a) a.manualRating = Math.max(0, Math.min(10, rating));
    return a;
  },

  toggleFavorite(trackId: number): TrackRow | undefined {
    const t = store.tracks.find((x) => x.id === trackId);
    if (t) t.isFavorite = !t.isFavorite;
    return t;
  },

  getMatchup(): [AlbumRow, AlbumRow] | null {
    if (store.albums.length < 2) return null;
    const pool = [...store.albums];
    const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    return [a, b];
  },

  vote(winnerId: number, loserId: number): { winner: AlbumRow; loser: AlbumRow } | null {
    const winner = this.getAlbum(winnerId);
    const loser = this.getAlbum(loserId);
    if (!winner || !loser || winnerId === loserId) return null;
    const next = updateElo(winner.eloRating, loser.eloRating);
    winner.eloRating = next.winner;
    loser.eloRating = next.loser;
    winner.matchCount++;
    loser.matchCount++;
    store.matches.push({
      id: store.nextMatchId++,
      albumAId: winnerId,
      albumBId: loserId,
      winnerId,
      createdAt: new Date().toISOString(),
    });
    return { winner, loser };
  },

  // --- 댓글 (익명, Music 전용) ---
  listComments(targetType: string, targetId: number): CommentRow[] {
    return store.comments
      .filter((c) => c.targetType === targetType && c.targetId === targetId && !c.isHidden)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  addComment(data: {
    targetType: string;
    targetId: number;
    authorName: string;
    passwordHash: string;
    content: string;
  }): CommentRow {
    const row: CommentRow = {
      id: store.nextCommentId++,
      ...data,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    store.comments.push(row);
    return row;
  },

  deleteComment(id: number, passwordHash: string): boolean {
    const c = store.comments.find((x) => x.id === id);
    if (!c || c.passwordHash !== passwordHash) return false;
    store.comments = store.comments.filter((x) => x.id !== id);
    return true;
  },

  // --- 좋아요 ---
  getLikes(targetType: string, targetId: number): number {
    return store.likes.find((l) => l.targetType === targetType && l.targetId === targetId)?.count ?? 0;
  },

  addLike(targetType: string, targetId: number): number {
    let row = store.likes.find((l) => l.targetType === targetType && l.targetId === targetId);
    if (!row) {
      row = { targetType, targetId, count: 0 };
      store.likes.push(row);
    }
    row.count++;
    return row.count;
  },

  exportAll() {
    return {
      albums: store.albums,
      tracks: store.tracks,
      matches: store.matches,
      comments: store.comments,
      likes: store.likes,
    };
  },
};
