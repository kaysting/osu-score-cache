const fs = require('fs');
const env = require('#env');
const Database = require('better-sqlite3');
const utils = require('#utils');
const path = require('path');

// Open database
utils.log(`Using database ${env.DB_PATH}`);
const db = new Database(env.DB_PATH);

// Set pragmas
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 15000');
db.pragma('synchronous = NORMAL');

// Initialize with schema if needed
const schemaFile = path.join(env.ROOT, 'database/schema.sql');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
if (fs.existsSync(schemaFile) && !tables.find(t => t.name === 'scores')) {
    utils.log('Initializing database from schema.sql...');
    const schema = fs.readFileSync(schemaFile, 'utf8');
    db.transaction(() => {
        db.exec(schema);
    })();
}

module.exports = db;