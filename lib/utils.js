const zlib = require('zlib');

const utils = {

    log: (...args) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}]`, ...args);
    },

    logError: (...args) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}]`, ...args);
    },

    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),

    compressData: data => zlib.brotliCompressSync(data),
    decompressData: compressed => zlib.brotliDecompressSync(compressed),

    getScoreCursor: data => {
        if (!data) return null;
        const payload = `${data.time_submitted}_${data.id}`;
        return Buffer.from(payload).toString('base64');
    },

    parseScoreCursor: cursor => {
        if (!cursor) return null;
        try {
            const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
            const [time, id] = decoded.split('_');

            // Verify both parts exist and are numbers
            if (!time || !id || isNaN(time) || isNaN(id)) return null;

            return {
                time: parseInt(time),
                id: parseInt(id)
            };
        } catch (e) {
            return null;
        }
    },

    clamp: (num, min, max) => {
        return Math.min(Math.max(num, min), max);
    }

};

module.exports = utils;