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

};

module.exports = utils;