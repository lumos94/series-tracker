# M2 — Local Tracking

> **Status:** Done. The schema and query functions described here are still the current data layer (see [architecture.md](architecture.md#data-layer)) — this file documents why they're shaped the way they are, which isn't otherwise recoverable from the code itself.

Reconstructed from commit `d8f8eb6` (`Add local SQLite tracking: follow shows, mark watched, watchlist`) plus the schema's later additions — no Notion page existed for this milestone.

## What was done

- Wired `expo-sqlite` + `drizzle-orm` for on-device storage: `src/db/client.ts` (the SQLite connection + drizzle instance) and `src/db/schema.ts` (table definitions).
- Replaced the M1 placeholder Up Next / Watchlist screens with real data, and added follow / add-to-watchlist / mark-watched controls to the show and movie detail screens.
- `src/db/queries.ts` established as the only place that touches the database directly — screens call functions like `followShow`, `markEpisodeWatched`, `getFollowedShows`, never raw SQL or the drizzle client itself.

## Schema (current shape)

```
shows              (id, name, poster_path, followed_at)                          -- followed TV shows
episodes_watched   (id, show_id, season_number, episode_number,
                     runtime_minutes, watched_at)                                -- unique on (show_id, season_number, episode_number)
watchlist          (id, tmdb_id, media_type, title, poster_path, added_at)       -- unique on (tmdb_id, media_type)
watched_movies     (id, title, poster_path, runtime_minutes, watched_at)
sync_meta          (key, value)                                                  -- currently just last-synced-at, see google-drive-backup.md
```

`runtime_minutes` on `episodes_watched`/`watched_movies` was added later (M3, commit `14ac0df`) to support hours-watched stats — see [stats.md](stats.md). It's nullable because TMDB doesn't always report a runtime.

## Key decisions

- **Unique indexes over app-level dedup checks**: `episodes_watched` and `watchlist` both have a unique index on their natural key, and every insert uses `onConflictDoNothing()`. This means "mark watched" and "add to watchlist" are naturally idempotent — calling them twice for the same episode/title is a no-op, not an error the caller has to guard against.
- **`shows` (followed) is a separate concept from `watchlist`**: following a show and watchlisting a show are different actions with different meaning (following = actively tracking progress episode-by-episode; watchlist = "want to watch, haven't started"). `unfollowShow` also cascades to delete that show's `episodes_watched` rows — there's no reason to keep episode-level watch history for a show you've explicitly unfollowed.
- **`getLastWatched`** (furthest-along watched episode, ordered by season then episode number) is the basis for "Up Next" — it assumes linear watching order, which holds for this app's actual usage pattern (a single user tracking their own shows) and keeps the query trivial. It doesn't try to handle a user who watches out of order — see [search-and-watchlists.md](search-and-watchlists.md) for how that gap was later addressed with an explicit "catch up on earlier episodes" prompt rather than changing this core query.

## Verify

Mark an episode watched, force-close and reopen the app, confirm it's still marked watched (i.e. it actually persisted to SQLite and wasn't just in-memory state).
