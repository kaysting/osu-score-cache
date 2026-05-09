[GitHub](https://github.com/kaysting/osu-score-cache) • [Website](https://osc.kaysting.dev/)

# osu! score cache

A JSON API and real-time WebSocket that provides access to recent passing scores submitted to the osu! servers. oSC also caches several days of scores, so you're able to get a lot more recent data than you can from the osu! API.

This project was created primarily for use with [osu!complete](https://osucomplete.org), but other devs might find it useful.

## Why would I use this over the osu! API?

This project mirrors and expands on osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint by:

- Providing a real-time websocket that broadcasts new scores, allowing clients to receive events passively instead of polling osu! servers.
- Allowing you to move forward/backward in the history of recent passing scores without caching arbitrary query strings.
- Allowing you to fetch recent scores in all modes with a single request.
- Allowing you to filter recent scores for only a single player or list of players

This project _does_ poll the osu! API's Get Scores endpoint every 5 seconds to collect new scores, but if it helps other devs avoid doing the same, it should have a net positive effect on osu!'s infrastructure.

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

Install and require the module:

```js
const { io } = require('socket.io-client');
```

Initialize the connection:

```js
const socket = io('https://osc.kaysting.dev', {
    path: '/ws', // socket is under /ws
    transports: ['websocket'] // avoid http polling
});
```

Connect and subscribe to rooms:

```js
socket.on('connect', () => {
    console.log(`Connected to osu! score cache!`);

    socket.emit('subscribe', 'scores'); // here we subscribe to the "scores" room
});
```

Listen for events:

```js
socket.on('scores', scores => {
    // Do something with the scores
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

`GET` `/`

Returns global stats for osu-score-cache.

**Successful response**

- integer `total_scores`: The total number of scores currently stored.
- integer `oldest`: A millisecond-based UNIX timestamp representing the time at which the first score currently stored was saved.
- integer `newest`: A millisecond-based UNIX timestamp representing the time at which the most recent score was saved.

#### Get Scores

`GET` `/scores`

Returns recently submitted passing scores.

**Query Parameters:**

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

**Successful Response**

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
- The database has been wiped, making scores cached before this point no longer accessible.
