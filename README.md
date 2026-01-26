[GitHub](https://github.com/kaysting/osu-score-cache)  •  [Website](https://osuscorecache.kaysting.dev/)

# osu! score cache
A JSON API and realtime WebSocket that provides access to recent passing scores submitted to the osu! servers across all game modes and map statuses. oSC also caches several days of scores, so you're able to move backwards and forwards in time using the API.

This project was created for use with [osu!complete](https://osucomplete.org), but there are bound to be other applications with similar needs.

## Why would I use this over the osu! API?
The primary intent of this project is for applications needing a real-time feed of new passing scores submitted to osu!, or if you need to use osu!'s [Get Scores](https://osu.ppy.sh/docs/#get-scores102) API endpoint with the ability to move backwards in history. Getting a real-time feed of recent scores would otherwise require polling the osu! API every X seconds, which exhausts rate limits and puts extra strain on their servers.

## How do I use it?

oSC is accessible as a real-time WebSocket or a traditional JSON API.

### Real-time WebSocket
The WebSocket is built using [Socket.io](https://socket.io/).

An example of how to connect and listen for scores in JavaScript can be found here: [examples/client.js](https://github.com/kaysting/osu-score-cache/blob/master/examples/client.js).

### JSON API

#### Base URL
All API endpoints are exposed under the base URL:
`https://osc.kaysting.dev/api`

If self-hosting, use your hostname but retain the `/api` path.

#### Error Object

Unsuccessful requests will be given the appropriate HTTP status code and sent an error object:
* boolean `success`: `false`, indicating that the request failed.
* string `message`: A human-readable error message.

#### Get Scores  
`GET` `/scores/{mode}`

Returns recently submitted passing scores.

**URL Parameters**

* string? `mode`: Optionally specify an osu! game mode (ruleset) to limit scores to only that mode. Valid modes are `osu`, `taiko`, `fruits` (for ctb), and `mania`.

**Query Parameters:**

* integer `limit`: The number of scores to return, from `1` to `1000`. Defaults to `100`.
* integer|string `before`: Return scores before this point. Accepts either a millisecond-based Unix timestamp or an opaque cursor string from a previous request.
* integer|string `after`: Return scores after this point. Accepts either a millisecond-based Unix timestamp or an opaque cursor string from a previous request.

**Successful Response**

* boolean `success`: `true`, indicating the request was successful.
* object `meta`: Information about the request.
  * integer `count`: The number of scores returned.
  * object? `cursors`: Cursor strings for pagination, or `null` if no scores were found.
    * string `older`: A cursor string to be used with the `before` query parameter.
    * string `newer`: A cursor string to be used with the `after` query parameter.
* array `scores`: A list of [Score](https://osu.ppy.sh/docs/#score) objects.from the osu! API.

### Rate Limits
The JSON API is limited to 60 requests per minute and will return HTTP status `429` with an error object.

The WebSocket currently has no rate limit but one may be added if we run into performance issues.