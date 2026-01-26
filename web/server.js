const fs = require('fs');
const path = require('path');
const http = require('http');
const env = require('#env');
const express = require('express');
const marked = require('marked');
const socketIo = require('socket.io');
const db = require('#db');
const utils = require('#utils');
const startPoller = require('./poller');

// Initialize server
const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
    cors: {
        origin: '*',
    },
    path: '/ws'
});

// Set up EJS for templating
app.set('view engine', 'ejs');
app.set('views', path.join(env.ROOT, 'web', 'views'));

// Expose API
app.use('/api', require('./api'));

// Serve homepage with documentation
app.get('/', (req, res) => {
    const readmePath = path.join(env.ROOT, 'README.md');
    const markdown = fs.readFileSync(readmePath, 'utf-8');
    const htmlContent = marked.parse(markdown);
    res.render('page', {
        content: htmlContent,
        title: 'osu! score cache',
        meta: {
            title: 'osu! score cache',
            description: `A JSON API and real-time WebSocket that provides access to recent passing scores submitted to the osu! servers.`
        }
    });
});

app.use((req, res, next) => {
    res.status(404).end();
});

// Set up socket.io
io.on('connection', (socket) => {
    socket.on('subscribe', (room) => {
        const validRooms = ['scores', 'scores_osu', 'scores_taiko', 'scores_fruits', 'scores_mania'];
        if (!validRooms.includes(room)) return;
        socket.join(room);
        utils.log(`Socket ${socket.id} joined room ${room}`);
    });
});

// Start server
server.listen(env.PORT, () => {
    utils.log(`Server listening on port ${env.PORT}`);
});

// Start the poller
startPoller(io);

// Handle graceful exiting
let hasExited = false;
function gracefulExit(code = 0) {
    if (hasExited) return;
    hasExited = true;
    try {
        db.close();
        server.close();
    } catch (err) {
        utils.log('Error during cleanup:', err);
    }
    process.exit(code);
}

process.on('exit', (code) => {
    utils.log(`Process exiting with code ${code}`);
    gracefulExit(code);
});

process.on('SIGINT', () => {
    utils.log('Received SIGINT');
    gracefulExit(0);
});

process.on('SIGTERM', () => {
    utils.log('Received SIGTERM');
    gracefulExit(0);
});

process.on('uncaughtException', (err) => {
    utils.logError('Uncaught exception:', err);
    gracefulExit(1);
});

process.on('unhandledRejection', (reason) => {
    utils.logError('Unhandled rejection:', reason);
    gracefulExit(1);
});