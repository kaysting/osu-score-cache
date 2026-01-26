require('dotenv').config({ quiet: true });
const path = require('path');

const env = {};

env.ROOT = path.resolve(__dirname, '..');

env.OSU_CLIENT_ID = process.env.OSU_CLIENT_ID || '';
env.OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET || '';

env.DB_PATH = process.env.DB_PATH || path.join(env.ROOT, 'database/storage.db');

module.exports = env;