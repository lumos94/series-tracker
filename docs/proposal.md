# TV Time Replica — Android App Proposal

> **Status:** M0–M5 are all complete and verified end-to-end, including a signed, installable release build.

Detailed implementation notes for the two most involved milestones live in their own files: [google-drive-backup.md](google-drive-backup.md) and [branding-and-release-build.md](branding-and-release-build.md).

The app was renamed **Watchlog** during M5 (was "tvapp" internally). It later went through a full visual redesign — see [cosmic-redesign.md](cosmic-redesign.md) — which changed the tab structure and UI kit described below. This file is kept as-is for historical context on the original decisions; see [architecture.md](architecture.md) for current state.

## Context

The user's favorite show/movie tracking app (TV Time) is shutting down. They want to replicate its core functionality as an Android app before that happens. This was a greenfield project. The user is an experienced Vue.js developer but had never worked with React or React Native before, so build steps introduced React concepts gradually and leaned on Vue analogies where useful.

**Decisions locked in:**

- **Framework**: Expo (managed React Native) — chosen over bare RN CLI because Expo ships ready-made modules for everything this app needs (SQLite, OAuth, background tasks, file system), with far less native Android code to write/maintain. Can always "eject" via `expo prebuild` later if a native module without Expo support is ever needed.
- **Metadata source**: TMDB (The Movie Database) — free API tier, good rate limits, great poster/artwork, easy signup.
- **v1 scope**: Core tracking only — search/discover, mark episodes watched, "Up Next" queue, watchlist, basic stats. No social features, no calendar/notifications yet.
- **Storage**: Local SQLite on-device (via `expo-sqlite`), no custom backend.
- **Backup**: Automatic weekly-ish backup of the local DB to the user's own Google Drive. Given Android aggressively restricts true background execution (Doze mode, OEM battery optimizations can delay or block scheduled background jobs by hours or skip them entirely), the reliable approach used is: **sync check on app launch/foreground** (if 7+ days since last sync, back up automatically) **plus a manual "Backup now" / "Restore from Drive" button** in Settings. No OS background-task scheduling in v1.

## Prerequisites (user-side, one-time, outside the code)

1. **TMDB account + API key**: sign up free at [themoviedb.org](http://themoviedb.org), request an API key (Developer, non-commercial use is fine for a personal app). ✅ Done.
2. **Google Cloud project for Drive access**:
   - Create a project in Google Cloud Console, enable the "Google Drive API".
   - Configure the OAuth consent screen in **Testing** mode and add the user's own Google account as a test user (avoids the "unverified app" warning/block, no Google review needed since only the developer uses it).
   - Create OAuth Client IDs: one **Web application** client (its Client ID is passed as `webClientId` — required by the sign-in library even for an Android-only app) and one **Android** client per signing certificate (debug and release each need their own, since Google ties one SHA-1 fingerprint to one Android OAuth client).
   - Request the `https://www.googleapis.com/auth/drive.appdata` scope — **not** `drive.file`, which only covers files created via a picker/app-visible flow and does not grant access to Drive's hidden `appDataFolder` that this app's backups actually use.

## Architecture (as originally proposed)

**Scaffold**: `create-expo-app` with TypeScript template, using **Expo Router** (file-based routing/navigation — each file under `app/` is a screen, similar in spirit to Nuxt's file-based pages).

**Navigation (original, pre-redesign)**:
- `app/(tabs)/index.tsx` — "Up Next": next unwatched episode per followed show
- `app/(tabs)/search.tsx` — TMDB search/discover
- `app/(tabs)/watchlist.tsx` — plan-to-watch list
- `app/(tabs)/profile.tsx` — stats + Settings (Drive backup/restore controls, last synced time, TMDB attribution notice as required by TMDB's ToS)
- `app/show/[id].tsx` and `app/movie/[id].tsx` — detail screens: seasons/episodes list, mark-watched controls, follow/add-to-watchlist actions

**UI kit (original)**: `react-native-paper` (Material Design components) to move fast without hand-building basic UI primitives. Roughly analogous to using Vuetify in a Vue app. Largely replaced by the cosmic design system — see [cosmic-redesign.md](cosmic-redesign.md).

**Data layer**:
- `src/api/tmdb.ts` — thin fetch wrapper around TMDB endpoints (search/multi, tv details, season details, movie details, image config). API key stored via Expo env config.
- `@tanstack/react-query` — caches TMDB network calls, handles loading/error/retry state.
- `expo-sqlite` + `drizzle-orm` (type-safe schema + migrations) for local storage. Tables: `shows` (tmdb_id, name, poster_path, followed_at), `episodes_watched` (show_id, season_number, episode_number, watched_at), `watchlist` (tmdb_id, media_type, added_at), `sync_meta` (key/value — stores `last_synced_at`).
- `src/db/queries.ts` — data-access functions wrapping drizzle calls: `markEpisodeWatched`, `getUpNext`, `addToWatchlist`, `getStats`, etc.

**Global state**: no global state library was actually needed in the end — `zustand` was planned but never installed; `@tanstack/react-query`'s cache plus local component state covered everything.

**Google Drive sync** (`src/lib/google-auth.ts`, `src/api/drive.ts`, `src/lib/backup.ts`) — see [google-drive-backup.md](google-drive-backup.md) for full detail:
- `@react-native-google-signin/google-signin` (not `expo-auth-session` — it's a native module, which required switching from Expo Go to a custom dev client) to obtain an access token scoped to `https://www.googleapis.com/auth/drive.appdata`.
- Backup: export all local tables to a JSON payload, upload/overwrite a fixed-name file in Drive's hidden `appDataFolder` via the Drive REST API (list-then-create-or-patch, not multipart upload). Files in `appDataFolder` don't show up in the normal Drive UI — only via the API/app.
- Restore: download that JSON file and replace local tables inside a single DB transaction (delete-then-reinsert), then reload app data.
- Trigger: on app launch, check `sync_meta.last_synced_at`; if missing or ≥ 7 days old, run a **silent-only** backup (never prompts for sign-in) if a Drive session already exists. Manual "Backup now" and "Restore from Drive" buttons (with a confirmation dialog before restore) + last-synced display live in the Profile screen.

## Build milestones

1. **M0 — Scaffold** ✅ *Done*: Expo + TypeScript + Expo Router, tab navigation skeleton, `react-native-paper` theming wired up.
2. **M1 — TMDB browsing** ✅ *Done*: search screen + show/movie detail screen (read-only), backed by real TMDB data.
3. **M2 — Local tracking** ✅ *Done*: SQLite schema + drizzle setup, follow a show, mark episode(s) watched (with runtime tracking for stats), "Up Next" screen logic, Watchlist screen.
4. **M3 — Stats** ✅ *Done*: episodes/movies watched, shows following, and estimated hours-watched tiles on the Profile screen, backed by a single aggregation query.
5. **M4 — Google Drive backup** ✅ *Done*: full OAuth + backup/restore/auto-sync implementation, verified on both debug and release builds. Full detail: [google-drive-backup.md](google-drive-backup.md).
6. **M5 — Polish** ✅ *Done*: custom app icon/splash/name ("Watchlog"), signed local release APK built and verified standalone. Full detail: [branding-and-release-build.md](branding-and-release-build.md).

v1 scope (M0–M5) shipped as originally planned. Feature work continued past v1 — see [search-and-watchlists.md](search-and-watchlists.md) (M6) and [cosmic-redesign.md](cosmic-redesign.md) for what came next.

## Follow-ups (nothing blocking, all optional)

- [x] ~~Commit the M5 changes~~ — done.
- [x] ~~Rename the Android package away from the personal-name one~~ — done: `com.gxenofontos.tvapp` → `com.greplay.watchlog`, after the repo went public on GitHub. Full detail on the branding page.
- [ ] Install the release APK on an actual phone — only tested on the Android emulator so far.
- [ ] Back up `release.keystore` (project root, gitignored) somewhere durable — losing it means future updates can't be signed to install over the existing app.
- [ ] If `expo prebuild -p android --clean` is ever re-run, re-add the `signingConfigs.release` block to `android/app/build.gradle` (that folder is gitignored/regenerated, so the manual signing edit doesn't survive a clean prebuild).
- Not planned to fix: the Google OAuth consent screen stays in **Testing** mode (occasional Drive re-sign-in after long inactivity, per [google-drive-backup.md](google-drive-backup.md)) — acceptable tradeoff for a single-user personal app.

## Notes for the user (coming from Vue)

- React components are functions that return JSX (HTML-like syntax in JS) instead of `<template>` blocks — conceptually similar role, different syntax.
- **Hooks** (`useState`, `useEffect`, custom hooks like the ones React Query provides) are the rough equivalent of the Composition API (`ref`, `computed`, `watchEffect`).
- There's no built-in two-way `v-model`-style binding — form inputs are controlled explicitly via state + `onChangeText` handlers.
- Expo Router's file-based screens are the closest thing to Vue Router / Nuxt pages.
