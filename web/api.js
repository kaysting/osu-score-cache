const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('#db');
const env = require('#env');
const utils = require('#lib/utils');

const router = express.Router();

router.use(
    rateLimit({
        windowMs: 1000 * 60,
        limit: 60,
        ipv6Subnet: 60,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message: `Rate limit exceeded. Please wait and try again. If you're polling for new scores, please use the websocket. Find documentation at https://osc.kaysting.dev.`
            });
        }
    })
);

const modeMap = {
    osu: 'osu',
    std: 'osu',
    taiko: 'taiko',
    fruits: 'fruits',
    catch: 'fruits',
    ctb: 'fruits',
    mania: 'mania'
};

router.get('/scores', (req, res) => {
    try {
        // Define constants
        const MAX_LIST_LENGTH = 32;
        const MAX_SCORE_COUNT = 1000;

        // Get params
        // Note: We use OR (||) instead of nullish (??) for numbers
        // because NaN isn't null or undefined
        const mode = modeMap[(req.query.mode || '').toLowerCase()] || null;
        const limit = utils.clamp(parseInt(req.query.limit) || 100, 1, MAX_SCORE_COUNT);
        const before = parseInt(req.query.before) || null;
        const after = parseInt(req.query.after) || null;
        const userIds = (req.query.user ?? '')
            .split(',')
            .map(id => parseInt(id))
            .filter(Boolean);
        const mapIds = (req.query.map ?? '')
            .split(',')
            .map(id => parseInt(id))
            .filter(Boolean);

        // Validate params
        const lists = [
            { name: 'user', list: userIds },
            {
                name: 'map',
                list: mapIds
            }
        ];
        for (const entry of lists) {
            if (entry.list.length > MAX_LIST_LENGTH) {
                return res.status(400).json({
                    success: false,
                    message: `List ${entry.name} may contain up to 32 entries, but ${entry.list.length} where provided.`
                });
            }
        }

        const whereClauses = [];
        const params = [];

        // Set query sort order explicitly
        // When after is passed, we want to start from the oldest scores
        // and work forward, but if no pagination or before is passed,
        // we want to start from the newest scores and work backwards
        // Think of this as the direction in time we want to read
        const sortOrder = after ? 'ASC' : 'DESC';

        // Handle mode filtering
        if (mode) {
            whereClauses.push(`mode = ?`);
            params.push(mode);
        }

        // Handle user filtering
        if (userIds.length) {
            whereClauses.push(`user_id IN (${userIds.map(id => '?').join(', ')})`);
            params.push(...userIds);
        }

        // Handle map filtering
        if (mapIds.length) {
            whereClauses.push(`map_id IN (${mapIds.map(id => '?').join(', ')})`);
            params.push(...mapIds);
        }

        // Handle before/after conditions
        // They can be used together but probably shouldn't
        if (before) {
            whereClauses.push(`time_saved < ?`);
            params.push(before);
        }
        if (after) {
            whereClauses.push(`time_saved > ?`);
            params.push(after);
        }

        // Push limit as a param for consistency
        params.push(limit);

        // Build SQL and get scores from db
        const sql = `
            SELECT * FROM scores
            ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''}
            ORDER BY time_saved ${sortOrder}
            LIMIT ?
        `;
        const scoresRaw = db.prepare(sql).all(...params);

        // Ensure initial scores array is sorted oldest to newest
        if (sortOrder == 'DESC') scoresRaw.reverse();

        // Build final scores array by pushing only the raw data
        const scores = [];
        for (const score of scoresRaw) {
            scores.push(JSON.parse(utils.decompressData(score.raw)));
        }

        // Build default data object
        // This keeps things DRY
        const data = {
            success: true,
            meta: {
                oldest: null,
                newest: null,
                count: 0,
                mode: mode ?? 'all',
                users: [],
                maps: []
            },
            scores: []
        };

        // If scores were returned, update data
        if (scoresRaw.length > 0) {
            data.scores = scores;
            data.meta.count = scores.length;
            data.meta.oldest = scoresRaw[0].time_saved;
            data.meta.newest = scoresRaw[scoresRaw.length - 1].time_saved;
            for (const score of scores) {
                const mapId = score.beatmap_id;
                const userId = score.user_id;
                if (!data.meta.users.includes(userId)) {
                    data.meta.users.push(userId);
                }
                if (!data.meta.maps.includes(mapId)) {
                    data.meta.maps.push(mapId);
                }
            }
        }

        // Respond
        res.json(data);
    } catch (err) {
        utils.logError('Error handling API request', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

router.use((req, res) => {
    res.status(404).json({ success: false, message: 'Invalid endpoint.' });
});

module.exports = router;
