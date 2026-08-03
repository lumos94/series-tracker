# M0 — Scaffold

> **Status:** Done. Superseded in parts by the cosmic redesign (tab bar is now 5 native tabs, not 4 Paper-themed ones) — see [cosmic-redesign.md](cosmic-redesign.md). Kept for historical context on the starting point.

Reconstructed from commit `32c2073` (`Set up 4-tab app skeleton and strip Expo demo boilerplate`) — this predates the Notion documentation habit, so there was no page for it originally.

## What was done

- Started from `create-expo-app`'s TypeScript template, then stripped all of the default Expo demo content: the Home/Explore example screens, the React/Expo logo assets, tab icon assets, and the tutorial images. None of that scaffolding is meant to survive into a real project.
- Replaced the demo's two tabs with four placeholder screens matching the proposal's planned navigation: **Up Next** (`index.tsx`), **Search**, **Watchlist**, **Profile** — each just a themed empty screen at this point, no real data yet.
- Wired up `react-native-paper` theming at the root layout level, since Paper was the chosen UI kit for v1 (see [proposal.md](proposal.md)).
- Added `eslint.config.js` for linting from the very start rather than bolting it on later.

## Why strip the boilerplate immediately, before any real feature work

Leaving demo code in place invites confusion later about what's actually load-bearing vs. leftover template filler — cheaper to delete it in the first commit than to figure out months later whether `explore.tsx` is still referenced from somewhere.

## Verify

App runs in the emulator/dev client showing four empty, themed tab screens with no crashes and no leftover demo assets in the bundle.
