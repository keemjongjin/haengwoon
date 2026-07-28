import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  real,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Drizzle ORM 테이블 정의. 참고: PLAN.md §4 DB 스키마. 평점(manual_rating) ⟂ Elo(elo_rating) 완전 분리
// — 하나는 관리자가 직접 매기는 "공식 점수", 하나는 앨범 월드컵 대결로 산출되는 "취향 순위"다.

/** 앨범 한 장. Spotify에서 등록해오되, 평점·리뷰·장르는 관리자가 직접 채워 넣는다. */
export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  spotifyAlbumId: varchar("spotify_album_id", { length: 64 }), // Spotify 기준 외부 ID. URL 슬러그로도 사용.
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  coverImageUrl: text("cover_image_url"),
  releaseDate: date("release_date"),
  reviewDate: date("review_date"), // 최근 리뷰 정렬용
  genre: varchar("genre", { length: 64 }),
  albumType: varchar("album_type", { length: 32 }).notNull().default("album"), // album | single | compilation
  review: text("review"), // 리뷰 한 줄
  manualRating: real("manual_rating"), // 0~10, 내가 지정 = 공식 점수 (미평가 시 null)
  eloRating: integer("elo_rating").notNull().default(1500),
  matchCount: integer("match_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 앨범에 속한 수록곡. 최애곡(isFavorite)은 앨범당 항상 1곡으로 repo.toggleFavorite()이 강제한다. */
export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  spotifyTrackId: varchar("spotify_track_id", { length: 64 }),
  title: text("title").notNull(),
  trackNumber: integer("track_number").notNull(),
  durationMs: integer("duration_ms"), // 앨범 상세 하단 총 재생시간 계산용
  previewUrl: text("preview_url"), // Spotify 30초 미리듣기 (없을 수 있음)
  isFavorite: boolean("is_favorite").notNull().default(false),
  manualRating: real("manual_rating"), // 곡별 평점 (0=그냥 그럼/1=좋음/2=개좋음, 관리자 지정)
  comment: text("comment"), // 곡별 코멘트 (관리자 지정, 더보기 메뉴/곡 스토리 공유에 노출)
  eloRating: integer("elo_rating").notNull().default(1500),
});

/** 익명 댓글 (Music 전용). Tech 블로그는 Giscus 사용하므로 여기 안 담김. */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  targetType: varchar("target_type", { length: 16 }).notNull(), // 'album'
  targetId: integer("target_id").notNull(),
  authorName: varchar("author_name", { length: 64 }).notNull(),
  passwordHash: text("password_hash").notNull(), // 익명 삭제용
  content: text("content").notNull(),
  isHidden: boolean("is_hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 앨범 월드컵 맞대결 투표 로그 — lib/music/elo.ts가 이 기록을 근거로 eloRating을 산출. */
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  albumAId: integer("album_a_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  albumBId: integer("album_b_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  winnerId: integer("winner_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 좋아요 이벤트 로그. (targetType,targetId,ip) 유니크 → IP당 1회로 제한. count는 행 수로 계산. */
export const likeEvents = pgTable(
  "like_events",
  {
    id: serial("id").primaryKey(),
    targetType: varchar("target_type", { length: 16 }).notNull(), // 'album' | 'post'
    targetId: integer("target_id").notNull(),
    ip: varchar("ip", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("like_events_unique").on(table.targetType, table.targetId, table.ip)]
);

// Tech 블로그 글은 content/posts/*.mdx 파일 + git push로 관리(lib/content/posts.ts). 이 테이블은
// "노출 여부"만 DB에 얹은 오버레이 — 콘텐츠 자체는 여전히 git이 원본.
/** 특정 글(slug)을 목록/RSS에서 숨길지 여부. 행이 없으면 기본 노출로 취급. */
export const postVisibility = pgTable("post_visibility", {
  slug: varchar("slug", { length: 200 }).primaryKey(),
  hidden: boolean("hidden").notNull().default(false),
});

/** 방문자 카운터 (자체 집계, 외부 서비스 없이). 페이지 로드마다 한 행씩 쌓인다. */
export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** 스토리 공유 카드용 프로필 (싱글턴, id=1 고정). 관리자 페이지에서 수정. */
export const profile = pgTable("profile", {
  id: integer("id").primaryKey(),
  displayName: varchar("display_name", { length: 64 }).notNull().default("Haengwoon"),
  photoUrl: text("photo_url"),
});
