const osu = require('./osu');
const fs = require('fs');
const sqlite3 = require('better-sqlite3');

const db = sqlite3('scores.db');
db.pragma('journal_mode = WAL');

const log = (...args) => {
    console.log(`[${new Date().toISOString()}]`, ...args);
};

const rulesetIntsToStrings = {
    0: 'osu',
    1: 'taiko',
    2: 'fruits',
    3: 'mania',
};

let loopCount = -1;
async function main() {
    loopCount++;
    try {
        // Get ruleset and cursor, then fetch scores
        const ruleset = rulesetIntsToStrings[loopCount % 4];
        log(`Fetching ${ruleset} scores...`);
        const cursor_string = db.prepare(`SELECT cursor FROM cursors WHERE mode = ?`)
            .get(ruleset)?.cursor || null;
        const res = await osu.getScores({ ruleset, cursor_string });
        // Save new scores
        if (res.scores.length > 0) {
            const insertScore = db.prepare(
                `INSERT OR IGNORE INTO scores 
                (id, user_id, beatmap_id, mode, ended_at, passed, grade,
                accuracy, max_combo, standardized_score, legacy_score,
                is_standard_fc, is_lazer_fc, pp, mods) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            const transaction = db.transaction((scores) => {
                for (const score of scores) {
                    insertScore.run(
                        score.id,
                        score.user_id,
                        score.beatmap_id,
                        ruleset,
                        new Date(score.ended_at).getTime(),
                        score.passed ? 1 : 0,
                        score.rank,
                        (score.accuracy * 100).toFixed(2),
                        score.max_combo,
                        score.total_score,
                        score.legacy_total_score,
                        score.legacy_perfect ? 1 : 0,
                        score.is_perfect_combo ? 1 : 0,
                        score.pp,
                        JSON.stringify(score.mods || [])
                    );
                }
            });
            transaction(res.scores);
            log(`Saved ${res.scores.length} new ${ruleset} scores`);
        }
        // Save new cursor
        if (!cursor_string) {
            db.prepare(`INSERT INTO cursors (mode, cursor, last_reset) VALUES (?, ?, ?)`).run(ruleset, res.cursor_string, Date.now());
        } else {
            db.prepare(`UPDATE cursors SET cursor = ? WHERE mode = ?`).run(res.cursor_string, ruleset);
        }
        // Wait
        setTimeout(main, 5000);
    } catch (error) {
        log('Error fetching scores:', error);
        setTimeout(main, 15000);
    }
}

main();

let _dbClosed = false;
function _closeDbAndExit(code = 0) {
    if (_dbClosed) return;
    _dbClosed = true;
    try {
        db.close();
        log('Database closed');
    } catch (err) {
        log('Error closing database:', err);
    }
    process.exit(code);
}

process.on('exit', (code) => {
    if (_dbClosed) return;
    try {
        db.close();
        log('Database closed on exit', code);
    } catch (err) {
        log('Error closing database on exit:', err);
    }
});

process.on('SIGINT', () => {
    log('Received SIGINT');
    _closeDbAndExit(0);
});

process.on('SIGTERM', () => {
    log('Received SIGTERM');
    _closeDbAndExit(0);
});

process.on('uncaughtException', (err) => {
    log('Uncaught exception:', err);
    _closeDbAndExit(1);
});

process.on('unhandledRejection', (reason) => {
    log('Unhandled rejection:', reason);
    _closeDbAndExit(1);
});