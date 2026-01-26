const env = require('#env');
const db = require('#db');
const utils = require('#utils');
const osu = require('#lib/osu');

const rulesetIntsToStrings = {
    0: 'osu',
    1: 'taiko',
    2: 'fruits',
    3: 'mania',
};

let lastCleanup = 0;

module.exports = io => {

    const poll = async () => {
        const START_TIME = Date.now();
        try {

            const newCursors = {};
            const scores = [];

            // Loop through modes and fetch recent scores for each
            for (const ruleset of Object.values(rulesetIntsToStrings)) {

                // Get cursor from db or make it undefined to fetch the latest 1000 scores
                const cursor = db.prepare(`SELECT cursor FROM cursors WHERE mode = ?`).get(ruleset)?.cursor || undefined;
                const res = await osu.getScores({
                    ruleset,
                    cursor_string: cursor
                });

                // Save scores to array and make note of cursor to save later
                scores.push(...res.scores);
                newCursors[ruleset] = res.cursor_string;

                // Broadcast mode specific scores
                if (res.scores.length > 0) {
                    io.to(`scores_${ruleset}`).emit('scores', res.scores);
                }

            }

            // Only broadcast/save if we got new scores
            if (scores.length > 0) {

                // Sort scores by time ascending
                scores.sort((a, b) => new Date(a.ended_at) - new Date(b.ended_at));

                // Broadcast all scores to global scores room
                io.to('scores').emit('scores', scores);

                // Save scores to db, including the raw score JSON compressed
                const insertScore = db.prepare(`INSERT INTO scores (id, mode, time_submitted, raw) VALUES (?, ?, ?, ?)`);
                db.transaction(() => {
                    for (const score of scores) {
                        const raw = utils.compressData(JSON.stringify(score));
                        insertScore.run(
                            score.id,
                            rulesetIntsToStrings[score.ruleset_id],
                            new Date(score.ended_at).getTime(),
                            raw
                        );
                    }
                })();

            }

            utils.log(`Saved and broadcasted ${scores.length} new scores in ${Date.now() - START_TIME}ms`);

            // Save cursors
            const insertCursor = db.prepare(`INSERT OR REPLACE INTO cursors (mode, cursor) VALUES (?, ?)`);
            db.transaction(() => {
                for (const mode in newCursors) {
                    insertCursor.run(mode, newCursors[mode]);
                }
            })();

            // Run cleanup process if it's been long enough
            const now = Date.now();
            const ONE_HOUR = 60 * 60 * 1000;
            if (now - lastCleanup > ONE_HOUR) {

                // Calculate cutoff date
                const days = parseInt(env.SCORE_CACHE_DAYS);
                const cutoffDate = now - (days * 24 * 60 * 60 * 1000);

                // Delete scores older than the cutoff
                utils.log(`Checking for scores older than ${days} days...`);
                const deleteOld = db.prepare('DELETE FROM scores WHERE time_submitted < ?');
                const info = deleteOld.run(cutoffDate);

                utils.log(`Pruned ${info.changes} old scores`);

                // Reset the timer
                lastCleanup = now;

            }

        } catch (error) {
            utils.logError('Error during polling:', error);
        }

        // Wait and poll again
        // Poll usually takes ~500ms, so we wait 3.5s to get it down to 60 requests/min
        // This abides by osu's soft rate limit
        setTimeout(poll, 3500);

    };

    poll();

};