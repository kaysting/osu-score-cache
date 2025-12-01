CREATE TABLE IF NOT EXISTS "cursors" (
	"mode"	TEXT NOT NULL,
	"cursor"	TEXT NOT NULL,
	"last_reset"	INTEGER NOT NULL,
	PRIMARY KEY("mode")
);
CREATE TABLE IF NOT EXISTS "scores" (
	"id"	INTEGER NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"beatmap_id"	INTEGER NOT NULL,
	"mode"	TEXT NOT NULL,
	"ended_at"	INTEGER NOT NULL,
	"passed"	INTEGER NOT NULL,
	"grade"	TEXT NOT NULL,
	"accuracy"	REAL NOT NULL,
	"max_combo"	INTEGER NOT NULL,
	"standardized_score"	INTEGER NOT NULL,
	"legacy_score"	INTEGER NOT NULL,
	"is_standard_fc"	INTEGER NOT NULL,
	"is_lazer_fc"	INTEGER NOT NULL,
	"pp"	INTEGER,
	"mods"	TEXT,
	PRIMARY KEY("id")
);
