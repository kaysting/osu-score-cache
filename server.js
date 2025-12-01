require('dotenv').config();
const express = require('express');
const marked = require('marked');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.set('views', './');

app.get('/', (req, res) => {
    const readmePath = './README.md';
    const markdown = fs.readFileSync(readmePath, 'utf-8');
    const htmlContent = marked.parse(markdown);
    res.render('page', {
        content: htmlContent,
        title: 'osu! score cache',
        meta: {
            title: 'osu! score cache',
            description: `A JSON API that provides access to all recent map passes submitted to the osu! servers, across all game modes and map statuses.`
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});