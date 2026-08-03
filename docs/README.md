# Watchlog docs

This folder is the single source of truth for why this app is built the way it is. It replaces Notion as the place project documentation lives — everything here is version-controlled, diffable in PRs, and readable without a Notion login.

## Read this first (AI tools and future devs)

If you are an AI coding tool (Claude Code, Lovable, Claude Design, or otherwise) about to make changes to this app: **read [architecture.md](architecture.md) before writing any code.** It describes the current stack, folder layout, data model, and design system. Making decisions without it risks re-deriving (or contradicting) choices that were already made deliberately.

The other files here are historical decision records — they explain *why* specific choices were made, including ones that were tried and abandoned. They're kept even after being superseded because the reasoning is often more useful than the current state alone.

## Index

- [architecture.md](architecture.md) — current stack, screens, data layer, and design system. Start here.
- [proposal.md](proposal.md) — the original project proposal: locked-in decisions for framework, storage, and backup strategy, and the v1 build milestones (M0–M5).
- [scaffold.md](scaffold.md) — M0: initial Expo Router + tab-skeleton scaffold.
- [tmdb-browsing.md](tmdb-browsing.md) — M1: TMDB API client, search, and read-only detail screens.
- [local-tracking.md](local-tracking.md) — M2: the SQLite schema and query-layer decisions behind follow/mark-watched/watchlist.
- [stats.md](stats.md) — M3: the watch-stats aggregation query and how estimated hours-watched works.
- [google-drive-backup.md](google-drive-backup.md) — M4: implementation notes for the Google Drive backup/restore feature, including what changed from the original plan and why.
- [branding-and-release-build.md](branding-and-release-build.md) — M5: app renaming, icon/splash asset generation, and how the signed release APK is built locally.
- [search-and-watchlists.md](search-and-watchlists.md) — M6: the movie/series search split, per-type watched/watchlist screens, and bulk mark-watched — later superseded by the cosmic redesign, kept for the still-current catch-up logic it introduced.
- [cosmic-redesign.md](cosmic-redesign.md) — the visual redesign that replaced the original Material/Paper UI with a custom dark "cosmic" theme, added the For You recommendations tab, and restructured Discover/Watchlist.

Milestones are numbered in the order they actually shipped (M0 → M6), not by importance — later docs frequently supersede earlier ones on specific screens/features while the underlying data layer carries forward. Where that's happened, each doc says so explicitly at the top.

## Conventions

- Each doc's **Status** line (if present) reflects the state as of the last edit — update it rather than leaving stale claims.
- Prefer editing an existing doc over creating a new one for related work; create a new file only for a genuinely new topic/milestone.
- These docs are project history and rationale, not API reference — don't duplicate what's better derived by reading the code itself (that goes stale immediately).
