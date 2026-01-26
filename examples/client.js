const { io } = require('socket.io-client');

const BASE_URL = 'https://osc.kaysting.dev';

// Initialize socket client
const socket = io(BASE_URL, {
    path: '/ws',
    transports: ['websocket'] // avoid http polling
});

// Connect to socket
socket.on('connect', () => {

    console.log(`Connected to osu! score cache!`);

    // Subscribe to start receiving scores
    // Valid rooms: scores, scores_osu, scores_taiko, scores_fruits, scores_mania
    // The scores room broadcasts all scores
    socket.emit('subscribe', 'scores');

});

// Listen for scores
socket.on('scores', scores => {
    for (const score of scores) {
        console.log(`${score.user_id} set a ${(score.accuracy * 100).toFixed(2)}% ${score.rank} rank on map ${score.beatmap_id} in mode ${score.ruleset_id}`);
    }
});