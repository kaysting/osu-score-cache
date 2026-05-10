# osu! score cache

GitHub: [kaysting/osu-score-cache](https://github.com/kaysting/osu-score-cache)  
Website: [osc.kaysting.dev](https://osc.kaysting.dev)

A JSON API and real-time WebSocket providing access to osu!'s recently submitted passing scores. oSC stores days of score history, letting your app sync back up after downtime with no hiccups.

This project was created primarily for use with [osu!complete](https://osucomplete.org), but other devs might find it useful.

## Why would I use this over the osu! API?

This project mirrors and expands on osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint by:

- Providing a real-time websocket that broadcasts new scores, allowing clients to receive events passively instead of polling osu! servers.
- Exposing a deeper history (up to 30 days) as opposed to only a couple days.
- Allowing navigation forwards and backwards in recent score history using timestamps instead of opaque query strings.
- Allowing you to fetch recent scores in all modes or a specific mode with a single request.
- Allowing you to filter recent scores for specific players or beatmaps (or both).

Unfortunately, this project _does_ poll the osu! API's Get Scores endpoint every 5 seconds to save and broadcast new scores, but if it helps other devs avoid doing the same, it should have a net positive effect on osu!'s infrastructure.

## How do I use it?

oSC is accessible as a real-time WebSocket or a traditional JSON API.

### Real-time WebSocket

The WebSocket using [Socket.io](https://socket.io/), which supports all major languages.

#### Socket.io setup

The Socket.io server is exposed under `https://osc.kaysting.dev/ws`. You may need to specify the path (`/ws`) separately from the base URL (`https://osc.kaysting.dev`).

#### Socket.io rooms

oSC only exposes a blanket scores event through the websocket, which broadcasts all new scores. If you need to filter recent scores by user/mode/map, use the JSON API documented below.

**scores**

Emits a `scores` event each time new passing scores in any mode are saved (roughly every 5 seconds). The event includes an array of [Score](https://osu.ppy.sh/docs/#score) objects from the osu! API.

This event does NOT send a backlog of scores on first connection. Use the JSON API documented below to get scores missed while offline.

**updates**

Emits an `update` event with the following object:

- integer `count`: The number of new scores saved
- integer `timestamp`: The current millisecond-based Unix timestamp

The intent is that you use this event as a signal to fetch the data you need from the API, or perform some other action.

#### Set up in JavaScript (web or Node.js)

```javascript
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
```

### JSON API

#### Base URL

All API endpoints are exposed under the base URL:
`https://osc.kaysting.dev/api`

If self-hosting, use your hostname but keep the `/api` part.

#### Error Object

Unsuccessful requests will be given the appropriate HTTP status code and served an error object:

- boolean `success`: `false`, indicating that the request failed.
- string `message`: A human-readable error message.

#### Get stats

`GET /`

Returns global stats and configuration for osu-score-cache. [Try it!](https://osc.kaysting.dev/api)

**Successful response**

```json
{
    "success": true,
    "oldest": 1778365140182,
    "newest": 1778380465392,
    "count": 198730,
    "config": {
        "max_list_length": 32,
        "max_score_request_limit": 1000
    }
}
```

- integer `total_scores`: The total number of scores currently stored.
- integer `oldest`: A millisecond-based UNIX timestamp representing the time at which the first score currently stored was saved.
- integer `newest`: A millisecond-based UNIX timestamp representing the time at which the most recent score was saved.
- object `config`: Contains settings for this instance of oSC.
    - integer `max_list_length`: The max number of users/maps that can be filtered in a single scores request.
    - integer `max_score_request_limit`: The max number of scores that can be requested (via the limit query param) in a single score request.

#### Get Scores

`GET /scores`

Returns recently submitted passing scores. [Try it!](https://osc.kaysting.dev/api/scores?limit=10&mode=osu)

**Query parameters**

- string? `mode`: An osu! game mode (ruleset) to fetch recent scores in. Defaults to all modes.  
   Valid modes:
    - `osu` or `std` for osu!standard
    - `taiko` for osu!taiko
    - `fruits`, `catch`, or `ctb` for osu!catch
    - `mania` for osu!mania
- integer? `limit`: The number of scores to return, from `1` to `1000`. Defaults to `100`.
- integer? `before`: Return scores before this point. Accepts a millisecond-based UNIX timestamp.
- integer? `after`: Return scores after this point. Accepts a millisecond-based UNIX timestamp.
- integer[]? `user`: Return scores set by a specific user/users. Accepts between 1 and 32 comma-separated user IDs.
- integer[]? `map`: Return scores set on a specific beatmap/maps. Accepts between 1 and 32 comma-separated beatmap IDs.

**Successful response**

```json
{
    "success": true,
    "meta": {
        "oldest": 1778379338446,
        "newest": 1778381392278,
        "count": 12,
        "mode": "all",
        "users": [10109518],
        "maps": [769831, 4667299, 4974900, 4900123, 5043509, 5063978]
    },
    "scores": [ ... ]
}
```

- boolean `success`: `true`, indicating the request was successful.
- object `meta`: Information about the request.
    - integer `count`: The number of scores returned.
    - integer `newest`: The millisecond-based UNIX timestamp of the newest score in this batch. Pass this as the `after` query param to get the next batch of scores.
    - integer `oldest`: The millisecond-based UNIX timestamp of the oldest score in this batch. Pass this as the `before` query param to get the previous batch of scores.
    - string `mode`: The mode of this batch of scores. One of `osu`, `taiko`, `fruits`, `mania`, or `all` if all modes are included.
    - integer[] `users`: A list of user IDs who have a score in this batch.
    - integer[] `maps`: A list of beatmap IDs that have a score in this batch.
- array `scores`: A list of [Score](https://osu.ppy.sh/docs/#score) objects from the osu! API.

### Rate Limits

The JSON API is strictly limited to 60 requests per minute and will return HTTP status `429` with an error object if exceeded.

The WebSocket currently has no rate limit but one may be added if we run into performance issues.

## Breaking changes

### 2026-05-09

- The `scores_{mode}` socket room has been removed.
- The `/scores` API endpoint has changed:
    - The `before` and `after` params now only accept millisecond-based UNIX timestamps.
    - The `{mode}` path parameter has been removed and the `mode` query param has been added in its place
    - The response no longer contains a `meta.cursors` object. Use `meta.newest` or `meta.oldest` for pagination instead.
- The database has been wiped, making scores cached before this point no longer accessible.
