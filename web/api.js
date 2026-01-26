const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('#db');
const utils = require('#utils');

const router = express.Router();

router.use(rateLimit({
    windowMs: 1000 * 60,
    limit: 60,
    ipv6Subnet: 60,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Rate limit reached. Please wait and try again.'
        });
    }
}));

const modeMap = {
    osu: 'osu',
    taiko: 'taiko',
    fruits: 'fruits',
    catch: 'fruits',
    mania: 'mania'
};

router.get('/scores{/:mode}', (req, res) => {
    try {
        const mode = req.params.mode ? (modeMap[req.params.mode] || null) : null;
        const limit = utils.clamp(parseInt(req.query.limit) || 100, 1, 1000);

        // Helper to parse base64 cursor or fallback to raw timestamp
        const parseParam = (param) => {
            if (!param) return null;
            // Try parsing base64 cursor
            const cursor = utils.parseScoreCursor(param);
            if (cursor) return cursor;

            // Fallback to treating as timestamp
            const timestamp = parseInt(param);
            if (!isNaN(timestamp)) {
                return { time: timestamp, id: null }; // No ID means "Loose" query
            }
            return null;
        };

        const beforeCursor = parseParam(req.query.before);
        const afterCursor = parseParam(req.query.after);

        // Validation
        if (req.query.before && req.query.after) {
            return res.status(400).json({ success: false, message: "Can't use 'before' and 'after' simultaneously." });
        }

        // If they provided text but we couldn't parse it as either Base64 or Number
        if ((req.query.before && !beforeCursor) || (req.query.after && !afterCursor)) {
            return res.status(400).json({ success: false, message: "Invalid cursor or timestamp." });
        }

        // Build SQL
        let queryStr = "SELECT raw, time_submitted, id FROM scores";
        const params = [];
        const conditions = [];

        if (mode) {
            conditions.push("mode = ?");
            params.push(mode);
        }

        let sortOrder = "DESC";

        // SCROLL FORWARD (Catch Up)
        if (afterCursor) {
            sortOrder = "ASC";

            if (afterCursor.id !== null) {
                // Precise (Cursor): Time is newer OR (Time is same AND ID is larger)
                conditions.push("((time_submitted > ?) OR (time_submitted = ? AND id > ?))");
                params.push(afterCursor.time, afterCursor.time, afterCursor.id);
            } else {
                // Loose (Timestamp Jump): Just newer than time
                conditions.push("time_submitted > ?");
                params.push(afterCursor.time);
            }
        }
        // SCROLL BACKWARD (Standard Feed)
        else {
            if (beforeCursor) {
                if (beforeCursor.id !== null) {
                    // Precise (Cursor): Time is older OR (Time is same AND ID is smaller)
                    conditions.push("((time_submitted < ?) OR (time_submitted = ? AND id < ?))");
                    params.push(beforeCursor.time, beforeCursor.time, beforeCursor.id);
                } else {
                    // Loose (Timestamp Jump): Just older than time
                    conditions.push("time_submitted < ?");
                    params.push(beforeCursor.time);
                }
            }
        }

        if (conditions.length > 0) {
            queryStr += " WHERE " + conditions.join(" AND ");
        }

        queryStr += ` ORDER BY time_submitted ${sortOrder}, id ${sortOrder} LIMIT ?`;
        params.push(limit);

        // Execute query
        const rows = db.prepare(queryStr).all(...params);

        // Decompress
        const scores = rows.map(row => JSON.parse(utils.decompressData(row.raw)));

        // Reverse if we fetched ASC so API is always Newest->Oldest
        if (sortOrder === "ASC") scores.reverse();

        // Generate cursors
        let cursors = null;
        if (scores.length > 0) {
            const first = scores[0]; // Newest
            const last = scores[scores.length - 1]; // Oldest

            cursors = {
                newer: utils.getScoreCursor({
                    time_submitted: new Date(first.ended_at).getTime(),
                    id: first.id
                }),
                older: utils.getScoreCursor({
                    time_submitted: new Date(last.ended_at).getTime(),
                    id: last.id
                })
            };
        }

        // Respond
        res.json({
            success: true,
            meta: {
                count: scores.length,
                cursors: cursors
            },
            scores
        });

    } catch (err) {
        utils.logError('Error handling API request', err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = router;