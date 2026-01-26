const express = require('express');

const router = express.Router();

// We need to enforce rate limits here, probably 60/min per IP

router.get('/scores{/:mode}', (req, res) => {

});

module.exports = router;