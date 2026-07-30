# 📺 Watchlog

Your TV shows and movies, tracked. No ads, no algorithm, no subscription — just you and your watch history.

## Why does this exist?

Because [TV Time](https://www.tvtime.com) is shutting down, and I refused to lose track of what episode I'm on for a dozen shows at once. So instead of migrating to some other app I don't fully trust, I built my own. It's Android-only, it's for personal use, and it does exactly what I need and nothing I don't.

**This entire project was vibe coded** with [Claude Code](https://claude.com/claude-code) — I described what I wanted, and an AI agent wrote it, debugged it, and shipped it. No hand-crafted boilerplate here.

## What it does

- 🔍 Search TV shows and movies (powered by [TMDB](https://www.themoviedb.org))
- ✅ Mark episodes and movies as watched, track runtime as you go
- 📋 Keep a watchlist of what's next
- 📊 See stats on what you've watched
- ☁️ Back up and restore your watch history to/from Google Drive — because losing this data twice would be embarrassing

## How it's built

- [Expo](https://expo.dev) (React Native) + TypeScript + Expo Router
- Local-first: everything lives in SQLite on your device via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [`drizzle-orm`](https://orm.drizzle.team) — no backend server to maintain or pay for
- Google Drive as the only "cloud" — auto-synced backups, manual restore
- [`react-native-paper`](https://reactnativepaper.com) for UI, [`@tanstack/react-query`](https://tanstack.com/query) for TMDB caching

## Running it locally

1. Install dependencies

   ```bash
   npm install
   ```

2. Add your own TMDB API key and Google OAuth web client ID to a `.env.local` file:

   ```
   EXPO_PUBLIC_TMDB_API_KEY=your_key_here
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_client_id_here
   ```

3. Start the app

   ```bash
   npx expo run:android
   ```

   Google Sign-In requires a native dev client (not Expo Go), so this project uses `expo-dev-client`.

## Notes

- Android only, by design — no iOS support planned.
