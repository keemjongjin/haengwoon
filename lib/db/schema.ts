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
} from "drizzle-orm/pg-core";

// 참고: PLAN.md §4 DB 스키마. 평점(manual_rating) ⟂ Elo(elo_rating) 완전 분리.

export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  spotifyAlbumId: varchar("spotify_album_id", { length: 64 }), // Spotify 기준 외부 ID
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  coverImageUrl: text("cover_image_url"),
  releaseDate: date("release_date"),
  reviewDate: date("review_date"), // 리더보드 1년 기준·최근 리뷰용
  genre: varchar("genre", { length: 64 }),
  manualRating: real("manual_rating"), // 0~10, 내가 지정 = 공식 점수 (미평가 시 null)
  eloRating: integer("elo_rating").notNull().default(1500),
  matchCount: integer("match_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id")
    .notNull()
    .references(() => albums.id, { onDelete: "cascade" }),
  spotifyTrackId: varchar("spotify_track_id", { length: 64 }),
  title: text("title").notNull(),
  trackNumber: integer("track_number"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  eloRating: integer("elo_rating").notNull().default(1500),
});

// 익명 댓글 (Music 전용). Tech 블로그는 Giscus 사용.
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

// 앨범 월드컵 투표 로그 (Elo 산출 근거)
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

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  targetType: varchar("target_type", { length: 16 }).notNull(), // 'album' | 'post'
  targetId: varchar("target_id", { length: 128 }).notNull(),
  count: integer("count").notNull().default(0),
});
