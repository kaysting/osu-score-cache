const env = require('#env');
const db = require('#db');
const utils = require('#utils');
const osu = require('#lib/osu');

const rulesetIntsToStrings = {
    0: 'osu',
    1: 'taiko',
    2: 'fruits',
    3: 'mania'
};

const getTotalStored = () => db.prepare(`SELECT COUNT(*) AS count FROM scores`).get().count;

let lastCleanup = 0;

const axios = require('axios');
let isOsuOnline = null;
const pokeOsuApi = async () => {
    const oldStatus = isOsuOnline;
    let statusCode = null;
    try {
        const token = await osu.getToken();
        await axios.get('/users/2', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            timeout: 1000 * 15
        });
        isOsuOnline = true;
    } catch (error) {
        statusCode = error.response?.status;
        isOsuOnline = statusCode === 401;
    }
    if (oldStatus !== isOsuOnline) {
        if (isOsuOnline) {
            utils.log(`osu! API is online`);
            if (oldStatus === false) {
                utils.logError(`osu! API access has been restored!`);
            }
        } else {
            utils.logError(
                `osu! API is currently inaccessible (error ${statusCode}), updates will be delayed until access is restored`
            );
        }
    }
    setTimeout(pokeOsuApi, 1000 * 60);
    return isOsuOnline;
};

module.exports = async io => {
    const poll = async () => {
        // Don't poll if we can't access osu API
        if (!isOsuOnline) {
            utils.log(`osu! API is offline, skipping poll`);
            return setTimeout(poll, 5000);
        }

        const START_TIME = Date.now();
        try {
            const newCursors = {};
            const scores = [];

            // Loop through modes and fetch recent scores for each
            for (const mode of Object.values(rulesetIntsToStrings)) {
                // Get cursor from db or make it undefined to fetch the latest 1000 scores
                const cursor = db.prepare(`SELECT cursor FROM cursors WHERE mode = ?`).get(mode)?.cursor || undefined;

                // Fetch the scores
                const res = await osu.getScores({
                    ruleset: mode,
                    cursor_string: cursor
                });

                // Sort scores oldest to newest
                // This seems redundant with the code further down but I wanna
                // make sure scores are broadcasted in a consistent order
                const modeScores = res.scores.sort((a, b) => {
                    return new Date(a.ended_at).getTime() - new Date(b.ended_at).getTime();
                });

                // Save scores to array and make note of cursor to save later
                scores.push(...modeScores);
                newCursors[mode] = res.cursor_string;
            }

            // Only broadcast/save if we got new scores
            if (scores.length > 0) {
                // Sort scores by time ascending
                // This also undoes the unintentional mode sort made before
                // by pushing scores to this array by mode
                scores.sort((a, b) => {
                    return new Date(a.ended_at).getTime() - new Date(b.ended_at).getTime();
                });

                // Broadcast all scores to global scores room
                io.to('scores').emit('scores', scores);

                // Save scores to db, including the raw score JSON compressed
                let now = Date.now();
                const insertScore = db.prepare(
                    `INSERT OR REPLACE INTO scores (
                        id, mode, time_saved, raw, user_id, map_id
                    )VALUES (?, ?, ?, ?, ?, ?)`
                );
                db.transaction(() => {
                    for (const score of scores) {
                        // britli-compress the JSON data to save on storage
                        const raw = utils.compressData(JSON.stringify(score));
                        insertScore.run(
                            score.id,
                            rulesetIntsToStrings[score.ruleset_id],
                            now,
                            raw,
                            score.user_id,
                            score.beatmap_id
                        );
                        // Increment current timestamp to ensure unique save times
                        now++;
                    }
                })();

                // Broadcast update notification
                io.to('updates').emit('update', {
                    count: scores.length,
                    timestamp: Date.now()
                });

                utils.log(
                    `Fetched, saved, and broadcasted ${scores.length} scores to ${io.engine.clientsCount} clients in ${Date.now() - START_TIME}ms`
                );
            } else {
                // osu is very active, this should almost never trigger
                utils.log(`Polled for new scores but receined none`);
            }

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
                const cutoffDate = now - days * 24 * 60 * 60 * 1000;

                // Delete scores older than the cutoff
                utils.log(`Checking for scores older than ${days} days...`);
                const res = db.prepare('DELETE FROM scores WHERE time_saved < ?').run(cutoffDate);
                if (res.changes) utils.log(`Pruned ${res.changes} old scores`);

                // Reset the timer
                lastCleanup = now;
            }
        } catch (error) {
            utils.logError('Error during polling:', error);
        }

        // Wait and poll again
        const minTime = env.POLL_INTERVAL_SECS;
        const elapsed = Date.now() - START_TIME;
        const timeLeft = Math.max(0, minTime - elapsed);
        setTimeout(poll, timeLeft);
    };

    await pokeOsuApi();
    poll();
};
