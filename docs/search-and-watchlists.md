# M6 — Movie/Series Search Split, Per-Type Lists & Bulk Mark-Watched

> **Status:** Superseded by the cosmic redesign. The separate Movies/TV search modes and the four dedicated `watched/`/`watchlist/` screens described here were replaced by a single filterable Discover screen and a single unified Watchlist grid — see [cosmic-redesign.md](cosmic-redesign.md). Kept because the underlying data functions and the catch-up logic it introduced are still exactly what the app uses today; only the screens changed.

Reconstructed from commit `c4a95fe` (`Add separate movie/series search, watched/watchlist lists, and bulk mark-watched`, merged via PR #1) — no Notion page ever existed for this milestone, and it fell between the M5 release-build work and the cosmic redesign without being named as a milestone at the time.

## What was done

- **Search split into two explicit modes** (Movies / TV Shows) instead of one mixed-type results list — `src/app/(tabs)/search.tsx` gained a type toggle rather than interleaving both media types in one feed.
- **Profile gained four dedicated list screens**: `src/app/watched/movies.tsx`, `src/app/watched/series.tsx`, `src/app/watchlist/movies.tsx`, `src/app/watchlist/series.tsx` — each a thin wrapper around a shared `src/components/watchlist-list-screen.tsx` + `media-row.tsx`, split by both watched-vs-watchlist and by media type (four combinations).
- **Bulk mark-watched**: `markEntireShowWatched()` (in the new `src/lib/watch-actions.ts`) lets a whole series be marked watched in one action, from either the search results or the show detail screen — useful for adding a show you've already finished without stepping through every episode individually.
- **Out-of-order catch-up prompt**: marking an episode watched when earlier episodes are still unwatched now offers to catch up on those earlier episodes too, rather than silently leaving gaps. `getUnwatchedEpisodesBefore()` computes exactly which prior episodes (earlier seasons in full, plus earlier episodes within the target season) are still unwatched, so the app can ask "also mark N earlier episodes watched?" instead of assuming linear viewing the way `getLastWatched` (see [local-tracking.md](local-tracking.md)) does for "Up Next".
- Version bumped to `1.1.0` for this feature release (the version before the cosmic redesign's `1.2.0`).

## Why split search by type instead of keeping one mixed list

A mixed movie/TV results list forces the user to visually parse type on every row. Once the user's stated intent for a search is usually "find a show" or "find a movie" (not both), an explicit mode toggle is a cheaper mental model than icon-per-row disambiguation — this is the same reasoning that later motivated the cosmic redesign's Discover filters, just applied earlier and less completely (no genre/sort filtering yet at this point, just type).

## Why this got replaced rather than extended

The four-screen split (`watched/movies`, `watched/series`, `watchlist/movies`, `watchlist/series`) meant a title's watched-vs-watchlist-vs-following state was implicitly encoded in *which screen it appeared on*, rather than being a queryable property of the title itself. The cosmic redesign's Lovable-derived design modeled "Watchlist" as one grid with an explicit status (`planned`/`watching`/`completed`) and filter chips instead — fewer screens, and status became data instead of routing. `getUnwatchedEpisodesBefore()`/`getAllUnwatchedEpisodes()`/`markEntireShowWatched()` from this milestone survived that redesign unchanged; only the four list screens and the media-row/watchlist-list-screen components were deleted.

## Verify

Mark an entire series watched via the bulk action, then mark a single earlier episode of a different show watched out of order and confirm the catch-up prompt correctly lists only the episodes before it (not the whole show).
