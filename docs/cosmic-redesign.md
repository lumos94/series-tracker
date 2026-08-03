# Cosmic redesign (v1.2.0)

> **Status:** Shipped and merged to `main` (PR #2, commit `5e73e38`). Version bumped `1.1.0` → `1.2.0`. This doc did not previously exist anywhere (including Notion) — written directly from the implementation to capture decisions that would otherwise only live in git history.

## Why

The original UI (`react-native-paper`, Material Design defaults) was functional but generic. The user found a visual design they liked in [Lovable](https://lovable.dev) — a "Cosmic TV Tracker" web app prototype — and asked to recreate that look and its feature set (a personalized "For You" recommendations tab, unified Discover/Watchlist) inside this Expo app, rather than continuing with the Paper-default look.

Scope was explicitly "everything": full visual redesign + new For You tab + full Discover genre/sort filtering, built on a fresh branch off `main`.

## What changed

- **Design system**: `src/constants/theme.ts` rewritten around a single `cosmic` dark palette (no light/dark split — the app forces `DarkTheme`), a `CosmicGradient` gradient definition, and an 8-weight `FontFamily` set (Space Grotesk + Inter via `@expo-google-fonts/*`).
- **New shared components**: `status-badge.tsx`, `progress-ring.tsx` (SVG ring via `react-native-svg`), `poster-card.tsx`, `episode-row.tsx`, `horizontal-list.tsx`, `filter-chip.tsx`, `poster-skeleton.tsx`, `cosmic-gradient.tsx` (`expo-linear-gradient`).
- **New tab**: For You (`src/app/(tabs)/for-you.tsx`) — Continue Watching row + scored recommendation sections. Backed by a new `src/lib/recommendations.ts`: builds a genre-affinity map from watch history (followed shows + watched movies), scores TMDB candidates on genre match / popularity / rating / recency / provenance, and produces sections like "Because you watched X", "Trending in your top genres", "Hidden gems for you", "Fresh releases for you".
- **Discover rebuilt**: `src/app/(tabs)/discover.tsx` replaces the old `search.tsx` — adds genre + sort filtering and infinite-scroll pagination (`useInfiniteQuery`) on top of search.
- **Watchlist unified**: the four legacy screens `watched/movies.tsx`, `watched/series.tsx`, `watchlist/movies.tsx`, `watchlist/series.tsx` were deleted and folded into a single `src/app/(tabs)/watchlist.tsx` grid with type/status/sort filter chips — a legitimate simplification matching the Lovable design's actual data model, not scope creep.
- **Detail screens reskinned**: `show/[id].tsx` and `movie/[id].tsx` — backdrop hero, season-chip model, `EpisodeRow`.
- **Settings + Stats reskinned**: `profile.tsx` renamed/rebuilt as `settings.tsx`; `stats.tsx` promoted to a top-level route.
- **TMDB API layer expanded** (`src/api/tmdb.ts`): added `still_path`/`vote_average` fields, `getTrending()`, `getGenreOptions()`, `discoverTitles()`, `getSimilar()`, `discoverByGenres()` — all needed by Discover and the recommendation engine.
- **5-tab bar**: `src/components/app-tabs.tsx` (native `NativeTabs`) updated to Home / For You / Discover / Watchlist / Settings; `app-tabs.web.tsx` updated in parallel for web.

## Real bugs found by actually running it on-device

Static checks (`tsc --noEmit`, `expo lint`, `expo export`) caught none of these — all four were only found by running the app on the Android emulator and exercising the actual flows. This is the reason the verification discipline below exists.

1. **Crash**: `PosterCard`'s array-typed `style` prop on `<Link asChild>`'s direct `Pressable` child. Expo Router's `Slot` (used internally by `asChild`) cannot handle an array or function `style` on its direct child — an array throws. Fixed with `StyleSheet.flatten([...])`. See the general note on this in [architecture.md](architecture.md#a-slotlink-gotcha-worth-knowing).
2. **Native module missing at runtime**: `expo-linear-gradient` and `react-native-svg` were added to `package.json` but the installed dev client didn't have them compiled in. A plain JS reload can't add new native code — required a full dev-client rebuild (`npx expo run:android`).
3. **Status bar overlap**: five screens (For You, Discover, Watchlist, Settings, Stats) had `SafeAreaView edges={['bottom']}` copy-pasted from the detail screens, which incorrectly excluded the top edge and let content run under the status bar. Fixed by removing the `edges` restriction on those five (Home correctly kept it, since its hero image is meant to extend under the status bar).
4. **Stale reactivity**: `getWatchedEpisodesForShow(id)` was called directly in render bodies / under-specified `useMemo`s in five places (Home's "Up Next" logic, For You's Continue Watching, Watchlist's progress calculation, the show detail screen's watched count, and the recommendations history builder). With the React Compiler enabled, this read is invisible to its dependency tracking, so progress numbers didn't update after marking an episode watched without a full reload. Fixed by routing every one of these through new `useWatchedEpisodes`/`useWatchedEpisodeCounts` hooks in `src/lib/watch-status.ts`, which wrap the read in `useQuery`/`useQueries` so `invalidateQueries` actually forces a re-fetch. Verified live on-device that progress updates immediately after marking an episode watched, with no reload.

## Verification approach established

Because none of the above were caught statically, the discipline going forward for any UI/behavior change in this app is: run `tsc --noEmit` + `expo lint`, then **actually exercise the flow on the emulator** via `adb`, check `logcat` for runtime errors, and — for data-correctness questions — inspect SQLite directly on-device (`adb shell run-as com.greplay.watchlog sqlite3 <dbpath>`, redirecting output to a file rather than piping directly, which is unreliable through nested shell quoting).

One coordinate gotcha worth remembering for future on-device testing: `adb exec-out screencap` screenshots are in actual device pixels (e.g. 1344×2992 on the emulator profile used), not whatever size a screenshot viewer displays them at — tap coordinates must be scaled up (~1.5× on that profile) from displayed-image pixels, or read directly from `adb shell uiautomator dump` bounds instead of eyeballing.

## Version bump

`1.1.0` → `1.2.0` (`package.json`, `app.json`, `package-lock.json`). Reasoning: this is a personal single-user app with no external API consumers, so classic semver "breaking change" rules don't strictly apply — the minor bump was chosen to signal the significance of the redesign (new tab, restructured navigation, full visual overhaul) without implying a v1-style relaunch, which a major bump would overstate for a solo project.

## Known follow-ups (not yet done)

- **Episode detail popup**: tapping an episode on the show detail screen should open a modal with the episode's still image, title, air date, overview, rating, and a "Mark as Watched"/"Mark as Unwatched" toggle — currently only the inline `EpisodeRow` tap target exists. Requested but not yet built as of this doc.
- **General visual polish pass**: subtler animations/transitions, richer use of the gradient/glow accents, better empty states — requested but not yet built; a Lovable design request for this was attempted but blocked by the workspace being out of Lovable credits.
- `react-native-paper` is still a dependency with a couple of leftover usages (see [architecture.md](architecture.md)) — not fully removed.
- M5 follow-ups from [proposal.md](proposal.md) (installing the release APK on an actual phone, backing up `release.keystore`) remain outstanding and are unrelated to this redesign.
