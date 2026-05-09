CREATE TABLE
	IF NOT EXISTS "cursors" ("mode" TEXT NOT NULL, "cursor" TEXT NOT NULL, PRIMARY KEY ("mode"));

CREATE TABLE
	IF NOT EXISTS "scores" (
		"id" INTEGER PRIMARY KEY,
		"time_saved" INTEGER NOT NULL,
		"mode" TEXT NOT NULL,
		"user_id" INTEGER NOT NULL,
		"map_id" INTEGER NOT NULL,
		"raw" BLOB NOT NULL
	);

CREATE INDEX IF NOT EXISTS "idx_scores_time" ON "scores" ("time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_user_time" ON "scores" ("user_id", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_map_time" ON "scores" ("map_id", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_map_user_time" ON "scores" ("map_id", "user_id", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_mode_time" ON "scores" ("mode", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_mode_user_time" ON "scores" ("mode", "user_id", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_mode_map_time" ON "scores" ("mode", "map_id", "time_saved");

CREATE INDEX IF NOT EXISTS "idx_scores_mode_map_user_time" ON "scores" ("mode", "map_id", "user_id", "time_saved");

CREATE TABLE
	IF NOT EXISTS "misc" ("key" TEXT NOT NULL, "value" TEXT NOT NULL, PRIMARY KEY ("key"));