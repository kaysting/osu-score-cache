[GitHub](https://github.com/kaysting/osu-score-cache)  •  [Website](https://osuscorecache.kaysting.dev/)

# osu! score cache
A JSON API and realtime WebSocket that provides access to recent passing scores submitted to the osu! servers across all game modes and map statuses. oSC also caches several days of scores, so you're able to move backwards and forwards in time using the API.

This project was created for use with [osu!complete](https://osucomplete.org), but there are bound to be other applications with similar needs.

## Why would I use this over the osu! API?
The primary intent of this project is for applications needing a real-time feed of new passing scores submitted to osu!, or if you need to use osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint with the ability to move backwards in history. Getting a real-time feed of recent scores would otherwise require polling the osu! API every X seconds, which exhausts rate limits and puts extra strain on their servers.

## How do I use it?
An example of how to connect to and listen for scores on the WebSocket can be found [here](/examples/client.js).

JSON API docs are coming soon...

## How do I host it?
Setup docs coming soon...