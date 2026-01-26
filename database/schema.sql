CREATE TABLE
	IF NOT EXISTS "cursors" ("mode" TEXT NOT NULL, "cursor" TEXT NOT NULL, PRIMARY KEY ("mode"));

CREATE TABLE
	IF NOT EXISTS "scores" (
		"id" INTEGER NOT NULL,
		"mode" INTEGER NOT NULL,
		"time_submitted" INTEGER NOT NULL,
		"raw" BLOB NOT NULL,
		PRIMARY KEY ("id")
	);

CREATE INDEX IF NOT EXISTS "idx_scores_timeline" ON "scores" ("time_submitted" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "idx_scores_mode_timeline" ON "scores" ("mode", "time_submitted" DESC, "id" DESC);

CREATE TABLE
	IF NOT EXISTS "misc" ("key" TEXT NOT NULL, "value" TEXT NOT NULL, PRIMARY KEY ("key"));