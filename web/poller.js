const db = require('#db');
const utils = require('#utils');
const osu = require('#lib/osu');

const rulesetIntsToStrings = {
    0: 'osu',
    1: 'taiko',
    2: 'fruits',
    3: 'mania',
};

module.exports = io => {

    const poll = async () => {
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

                // Broadcast all scores to global scores room
                io.to('scores').emit('scores', scores);

                // Save scores to db
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
                utils.log(`Saved ${scores.length} new scores`);

            }

            // Save cursors
            const insertCursor = db.prepare(`INSERT OR REPLACE INTO cursors (mode, cursor) VALUES (?, ?)`);
            db.transaction(() => {
                for (const mode in newCursors) {
                    insertCursor.run(mode, newCursors[mode]);
                }
            })();

        } catch (error) {
            utils.logError('Error during polling:', error);
        }

        // Wait and poll again
        setTimeout(poll, 2500);

    };

    poll();

};