// Install and require the module
// On web, use the Socket.io CDN
const { io } = require('socket.io-client');

// Initialize client
const socket = io('https://osc.kaysting.dev', {
    path: '/ws',
    transports: ['websocket'] // avoid http polling
});

// Connect to socket
socket.on('connect', () => {
    console.log(`Connected to osu! score cache!`);

    // Subscribe to start receiving scores
    socket.emit('subscribe', 'scores');
});

// Listen for scores
socket.on('scores', scores => {
    // Do something with the new scores
    // Score objects don't contain user/map metadata, so you'll have to request
    // those details from the osu! API afterwards
    for (const score of scores) {
        console.log(
            `User ${score.user_id} just got a ${(score.accuracy * 100).toFixed(2)}% ${score.rank} rank on map ${score.beatmap_id} in mode ${score.ruleset_id}`
        );
    }
});
