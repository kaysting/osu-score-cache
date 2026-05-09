[GitHub](https://github.com/kaysting/osu-score-cache) • [Website](https://osc.kaysting.dev/)

# osu! score cache

A JSON API and real-time WebSocket that provides access to recent passing scores submitted to the osu! servers. oSC also caches several days of scores, so you're able to get a lot more recent data than you can from the osu! API.

This project was created primarily for use with [osu!complete](https://osucomplete.org), but other devs might find it useful.

## Why would I use this over the osu! API?

This project mirrors and expands on osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint by:

- Exposing a real-time websocket that broadcasts new scores, allowing clients to receive events passively instead of polling osu! servers
- Allowing you to move forward/backward in the history of recent passing scores without caching arbitrary query strings
- Allowing you to fetch recent scores in all modes with a single request
- Reducing load on osu!'s infrastructure from developers who would otherwise poll the osu! API

This project _does_ poll the osu! API's Get Scores endpoint every 5 seconds to collect new scores, but if it helps other devs avoid doing the same, it should have a net positive effect on osu!'s infrastructure.

## How do I use it?

oSC is accessible as a real-time WebSocket or a traditional JSON API.

### Real-time WebSocket

The WebSocket is built using [Socket.io](https://socket.io/).

#### Socket.io Rooms

**scores** or **scores\_{mode}**

Emits a `scores` event with an array of the most recent [Score](https://osu.ppy.sh/docs/#score) objects from the osu! API in all modes.

If a `scores_{mode}` room is used, it returns the same as above, but returns only scores set in that specific `{mode}`.  
Mode must be one of `osu`, `taiko`, `fruits` (for ctb), or `mania`.

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

#### Get Scores

`GET` `/scores/:mode`

Returns recently submitted passing scores.

**URL Parameters**

- string? `mode`: Optionally specify an osu! game mode (ruleset) to limit scores to only that mode. Valid modes are `osu`, `taiko`, `fruits` (for ctb), and `mania`. Requesting `/scores` without a mode returns scores in all modes.

**Query Parameters:**

- integer `limit`: The number of scores to return, from `1` to `1000`. Defaults to `100`.
- integer|string `before`: Return scores before this point. Accepts a millisecond-based UNIX timestamp.
- integer|string `after`: Return scores after this point. Accepts a millisecond-based UNIX timestamp.

**Successful Response**

- boolean `success`: `true`, indicating the request was successful.
- object `meta`: Information about the request.
    - integer `count`: The number of scores returned.
    - integer `newest`: The millisecond-based UNIX timestamp of the newest score in this batch. Pass this as the `after` query param to get the next batch of scores.
    - integer `oldest`: The millisecond-based UNIX timestamp of the oldest score in this batch. Pass this as the `before` query param to get the previous batch of scores.
- array `scores`: A list of [Score](https://osu.ppy.sh/docs/#score) objects from the osu! API.

### Rate Limits

The JSON API is strictly limited to 60 requests per minute and will return HTTP status `429` with an error object if exceeded.

The WebSocket currently has no rate limit but one may be added if we run into performance issues.
