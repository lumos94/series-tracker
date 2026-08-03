# M3 — Stats

> **Status:** Done. The aggregation query described here is still current (`getWatchStats` in `src/db/queries.ts`); only its screen moved, from the original Profile tab to the dedicated `src/app/stats.tsx` route during the cosmic redesign (see [cosmic-redesign.md](cosmic-redesign.md)).

Reconstructed from commits `14ac0df`, `b6593e8`, and `3d5411b` — no Notion page existed for this milestone.

## What was done, in order

1. **`14ac0df` — add `runtime_minutes` columns**: added nullable `runtime_minutes` to both `episodes_watched` and `watched_movies`, purely to lay groundwork for hours-watched estimation later. No behavior change yet.
2. **`b6593e8` — record runtimes on mark-watched**: threaded TMDB's per-episode/per-movie runtime through `markEpisodeWatched`, `markSeasonWatched`, and `markMovieWatched`, so runtime is captured at the moment something is marked watched (not looked up retroactively).
3. **`3d5411b` — `getWatchStats` aggregation query**: replaced ad-hoc episode/movie count helpers with a single `getWatchStats()` returning `{ episodesWatched, moviesWatched, showsFollowed, estimatedHours }`.

## How estimated hours watched works

```ts
const DEFAULT_EPISODE_MINUTES = 42;
const DEFAULT_MOVIE_MINUTES = 110;
```

Each watched episode/movie contributes its stored `runtime_minutes` if known, otherwise a default (42 min for an episode, 110 min for a movie — typical TV/film runtimes). This means **hours watched is always an estimate, never exact** for anything watched before `runtime_minutes` existed, or for content TMDB doesn't report a runtime for. That's an accepted tradeoff — the alternative (blocking mark-watched until a runtime is confirmed present) would add friction for no real benefit in a personal tracking app.

## Why runtime is captured at watch-time rather than joined from TMDB at query-time

`getWatchStats()` only touches local SQLite — no network calls. If it instead joined against live TMDB data for every watched episode/movie, computing stats would mean N TMDB requests (slow, rate-limited, and pointless if the user hasn't watched anything new). Capturing runtime once, at the moment of marking watched, keeps stats a pure, instant local aggregation.

## Verify

Mark a few episodes and a movie watched, open Stats, and confirm the counts and hours-watched estimate move as expected (including for content with no known runtime, which should still count using the defaults above rather than being silently excluded).
