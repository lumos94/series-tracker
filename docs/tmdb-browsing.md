# M1 — TMDB Browsing

> **Status:** Done. The search screen itself was later split into separate Movies/TV modes (see [search-and-watchlists.md](search-and-watchlists.md)) and then replaced again by the cosmic Discover screen (see [cosmic-redesign.md](cosmic-redesign.md)). The API client and detail-screen approach described here are still the foundation both later versions built on.

Reconstructed from commit `39d2501` (`Add TMDB search and show/movie detail screens`) — no Notion page existed for this milestone.

## What was done

- `src/api/tmdb.ts` — a typed fetch wrapper around the TMDB endpoints needed for browsing: multi-search, TV details, season details, movie details, plus the image-config base URLs for building poster/backdrop URLs. This file is the single place that knows about TMDB's response shapes; screens never fetch TMDB directly.
- `@tanstack/react-query` wired up (`QueryClientProvider` at the root) to handle loading/error/retry state around those calls, and to cache repeat lookups (e.g. revisiting a show detail screen you already viewed).
- A debounced search screen (`src/app/(tabs)/search.tsx`) covering both movies and TV shows in one mixed results list.
- Detail screens: `src/app/show/[id].tsx` (with lazy-loaded season/episode listings — episodes for a season are only fetched when that season is expanded, not all up front) and `src/app/movie/[id].tsx`. Both were read-only at this point — no follow/watchlist/mark-watched actions yet, those arrived in M2.
- **Routing restructure**: screens were moved into an `(tabs)` route group under a root `Stack`, specifically so detail screens (`show/[id]`, `movie/[id]`) can push on top of the tab bar rather than being tabs themselves. This is the routing shape the app still uses today.

## Why lazy-load seasons instead of fetching a show's full episode list up front

A show detail screen only needs season summaries (number, episode count, air date) to render its season-chip list. Fetching every season's full episode list eagerly would mean N+1 TMDB requests per show view for shows the user probably won't expand every season of. Fetching a season's episodes on expand keeps the initial detail-screen load fast regardless of how many seasons a show has.

## Verify

Search for a real show and a real movie, open both detail screens, and confirm season/episode data matches TMDB's own listing for that title.
