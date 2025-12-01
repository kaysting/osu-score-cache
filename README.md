# osu! score cache
A JSON API that provides access to all recent map passes submitted to the osu! servers, across all game modes and map statuses. Results can be filtered by user and score submission time.

## Why should I use this over the osu! API?
The primary reason this project exists is so you can get a user's recent scores from before just the past 24 hours, since that appears to be the limitation of osu's [Get User Scores](https://osu.ppy.sh/docs/#get-user-scores) endpoint (with type `recent`).

It may also come in handy if you need to scrape scores for analytical purposes, although there are other, likely better, ways to acquire data for that (such as the dumps from [data.ppy.sh](https://data.ppy.sh)).

## How does it work?
The updater uses the osu! API's [Get Scores](https://osu.ppy.sh/docs/#get-scores102) endpoint to fetch global recent scores every few seconds for each game mode, then save them to a local database to be queried later by users of this API.

## How do I use it?
API docs coming soon...