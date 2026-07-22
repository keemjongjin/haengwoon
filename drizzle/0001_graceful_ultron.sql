ALTER TABLE "likes" ALTER COLUMN "target_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "tracks" ALTER COLUMN "track_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "review" text;