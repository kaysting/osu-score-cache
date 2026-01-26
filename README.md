[GitHub](https://github.com/kaysting/osu-score-cache)  •  [Website](https://osuscorecache.kaysting.dev/)

# osu! score cache
A JSON API and realtime WebSocket that provides access to recent map passes submitted to the osu! servers, across all game modes and map statuses. oSC caches several days of scores, so you're able to move backwards and forwards in time using the API.

## Why should I use this over the osu! API?
The primary appeal of this project is for applications where you need a real-time feed of new passing scores submitted to osu!, or if you need to use osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint with the ability to move backwards in history.

## How do I use it?
An example of how to connect to and listen for scores on the WebSocket can be found [here](/examples/client.js).

JSON API docs are coming soon...

## How do I host it?
Setup docs coming soon...