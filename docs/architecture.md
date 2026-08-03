# Architecture (current state)

**Watchlog** is a personal, single-user, Android-only TV/movie tracking app. Local-first, no backend server — Google Drive is the only "cloud" and it's used purely for backup/restore, not sync between multiple devices/users.

For why these choices were made, see [proposal.md](proposal.md), [google-drive-backup.md](google-drive-backup.md), [branding-and-release-build.md](branding-and-release-build.md), and [cosmic-redesign.md](cosmic-redesign.md). This file only describes what's true *right now*.

## Stack

- **Expo** (managed React Native, SDK 57) + TypeScript + **Expo Router** (file-based routing under `src/app/`)
- **expo-dev-client** — required because of native modules (`@react-native-google-signin/google-signin`, `react-native-svg`, `expo-linear-gradient`); this app cannot run in plain Expo Go
- **expo-sqlite** + **drizzle-orm** for local storage — the only persistence layer, no backend
- **@tanstack/react-query** — not used for real network caching, but as a reactivity layer over synchronous SQLite reads and TMDB fetches. See "SQLite + React Query" below, it has a sharp edge.
- **TMDB** (themoviedb.org) for all show/movie metadata, images, search, and discovery
- React Compiler is enabled (`experiments.reactCompiler` in `app.json`) — see the caveat below, it changes what's safe to write in render bodies.

Read the exact versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before assuming API behavior — Expo's APIs move fast between SDK versions.

## Navigation / screens

Five bottom tabs (`src/components/app-tabs.tsx`, native `NativeTabs`; `app-tabs.web.tsx` is a parallel web-only implementation):

| Route | File | Purpose |
|---|---|---|
| Home | `src/app/(tabs)/index.tsx` | Hero, "Up Next" episode per followed show, For You teaser, stats teaser |
| For You | `src/app/(tabs)/for-you.tsx` | Continue Watching row + personalized recommendation sections |
| Discover | `src/app/(tabs)/discover.tsx` | Search + genre/sort filtering, infinite-scroll grid |
| Watchlist | `src/app/(tabs)/watchlist.tsx` | Unified grid of followed shows + watched movies + watchlist-only items, with type/status/sort filter chips |
| Settings | `src/app/(tabs)/settings.tsx` | Drive backup/restore controls, last-synced time, TMDB attribution |

Plus non-tab routes: `src/app/show/[id].tsx`, `src/app/movie/[id].tsx` (detail screens — backdrop hero, season/episode list, follow/watchlist/mark-watched actions), and `src/app/stats.tsx` (episodes/movies watched, shows following, estimated hours watched).

There is **no separate watched/watchlist-by-type screen anymore** — `watched/movies.tsx`, `watched/series.tsx`, `watchlist/movies.tsx`, `watchlist/series.tsx` were deleted during the cosmic redesign and folded into the single Watchlist tab with filter chips instead.

## Data layer

- `src/db/schema.ts` / `src/db/client.ts` — drizzle schema and SQLite client. Tables: `shows` (followed shows), `episodes_watched`, `watchlist`, `watched_movies`, `sync_meta` (key/value, stores `last_synced_at`).
- `src/db/queries.ts` — all data-access functions (`markEpisodeWatched`, `getFollowedShows`, `getWatchlist`, `getWatchedMovies`, `getWatchedEpisodesForShow`, `exportAllData`/`importAllData` for backup, stats aggregation, etc.). Screens call these, never raw SQL.
- `src/api/tmdb.ts` — TMDB fetch wrapper: search, tv/movie details, season details, trending, genre options, discover/similar-titles for recommendations.
- `src/lib/watch-status.ts` — `WatchStatus` type (`planned`/`watching`/`completed`), `deriveShowStatus`/`deriveMovieStatus`, `computeEpisodeProgress`, and the `useWatchedEpisodes`/`useWatchedEpisodeCounts` hooks (see reactivity caveat below).
- `src/lib/recommendations.ts` — "For You" scoring: builds a genre-affinity map from watch history, scores TMDB candidates (genre match + popularity + rating + recency + provenance), used to build sections like "Because you watched X", "Trending in your top genres", "Hidden gems", "Fresh releases".
- `src/lib/backup.ts`, `src/lib/google-auth.ts`, `src/api/drive.ts` — Google Drive backup/restore. Full detail in [google-drive-backup.md](google-drive-backup.md).

### SQLite + React Query: the sharp edge

`expo-sqlite` reads are synchronous and don't participate in React's reactivity on their own. React Query is layered on top purely so `invalidateQueries` can force a re-fetch when a write happens elsewhere (e.g. marking an episode watched on the detail screen should update the Home screen's progress ring without a reload).

**Do not call a live SQLite read function (e.g. `getWatchedEpisodesForShow(id)`) directly in a component's render body, or inside a `useMemo`/`useQueries` result whose deps don't reflect it.** With the React Compiler enabled, such a call is invisible to the compiler's auto-memoization and can silently return stale data across re-renders that aren't triggered by a change to its own (non-existent) reactive inputs. This caused real bugs during the cosmic redesign (stale watched-episode counts on Home, For You, and Watchlist) — the fix was always to route the read through `useWatchedEpisodes`/`useWatchedEpisodeCounts` (which wrap it in `useQuery`/`useQueries`) and invalidate the relevant query key on write. If you add a new screen that reads per-show or per-episode watched state, use those existing hooks rather than a fresh direct call.

## Design system

Single dark "cosmic" theme (no separate light theme — `DarkTheme` is forced). Defined in `src/constants/theme.ts`:

- `cosmic` — the color palette (background, surface, primary, text, textSecondary, status colors, etc.)
- `CosmicGradient` — gradient stop definitions used by `src/components/cosmic-gradient.tsx` (`expo-linear-gradient`)
- `FontFamily` — 8 weight variants across Space Grotesk (display/headings) and Inter (body), loaded via `@expo-google-fonts/*` and `useFonts` in `src/app/_layout.tsx`

Shared components: `poster-card.tsx`, `episode-row.tsx`, `horizontal-list.tsx`, `filter-chip.tsx`, `poster-skeleton.tsx`, `progress-ring.tsx` (SVG-based, `react-native-svg`), `status-badge.tsx`. `themed-text.tsx`/`themed-view.tsx` are the base primitives everything else builds on.

**`react-native-paper` is still a dependency** but is largely vestigial post-redesign — only a couple of leftover usages remain (e.g. `ActivityIndicator` in `for-you.tsx`). Don't reach for Paper components in new cosmic-themed UI; use the shared components above instead so new screens stay visually consistent.

### A Slot/Link gotcha worth knowing

Expo Router's `<Link asChild>` (and `NativeTabs`' `TabTrigger asChild`) clones its single direct child via an internal `Slot` component. That `Slot` **cannot handle an array-typed or function-typed `style` prop** on the direct child — an array throws a render error, and a function returning an array silently breaks the layout (flex row collapses to column) with no error at all. If a `Pressable`/`View` is the direct child of `asChild`, its `style` must be a plain object or `StyleSheet.flatten([...])`, never `style={({pressed}) => [...]}` or a raw array. This has bitten this codebase twice (`PosterCard`, and the Settings `MenuRow`) — check for it first if a new `asChild`-wrapped pressable renders wrong.

## Build & environment notes

- Android SDK lives at `/opt/homebrew/share/android-commandlinetools` (Homebrew `android-commandlinetools` cask) on the primary dev machine — **not** the Expo-CLI-default `~/Library/Android/sdk`. Export `ANDROID_HOME`/`ANDROID_SDK_ROOT` per shell session before `expo run:android` or a Gradle build.
- Release APKs are built locally (`cd android && ./gradlew assembleRelease`), signed with `release.keystore` (gitignored, project root). EAS Build is configured (`eas.json`) but cloud builds hit long free-tier queue times in practice — local build is the path actually used. Full detail in [branding-and-release-build.md](branding-and-release-build.md).
- `android/` is gitignored and fully regenerated by `expo prebuild -p android --clean`. That wipes the manual `signingConfigs.release` block in `android/app/build.gradle` — it must be re-added after any clean prebuild, before `assembleRelease` will produce a correctly-signed build.
