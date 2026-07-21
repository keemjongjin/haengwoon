CREATE TABLE "albums" (
	"id" serial PRIMARY KEY NOT NULL,
	"spotify_album_id" varchar(64),
	"title" text NOT NULL,
	"artist" text NOT NULL,
	"cover_image_url" text,
	"release_date" date,
	"review_date" date,
	"genre" varchar(64),
	"manual_rating" real,
	"elo_rating" integer DEFAULT 1500 NOT NULL,
	"match_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" integer NOT NULL,
	"author_name" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"content" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" varchar(128) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"album_a_id" integer NOT NULL,
	"album_b_id" integer NOT NULL,
	"winner_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"album_id" integer NOT NULL,
	"spotify_track_id" varchar(64),
	"title" text NOT NULL,
	"track_number" integer,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"elo_rating" integer DEFAULT 1500 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_album_a_id_albums_id_fk" FOREIGN KEY ("album_a_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_album_b_id_albums_id_fk" FOREIGN KEY ("album_b_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_albums_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;