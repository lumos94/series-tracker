# M5 — Branding & Release Build

> **Status:** Done and verified — custom branding applied, installable signed release APK built and tested.

## App renamed

`tvapp` → **Watchlog** (`app.json` `name`). The Expo project slug became `watch-log` (the plain `watchlog` slug was already taken when the EAS project was created). Android `package` name was initially left as `com.gxenofontos.tvapp` since it was already tied to the Google OAuth clients from M4 and there were no installs yet to risk breaking — but see below, it was changed shortly after.

## Package name changed again, after the repo went public

The repo was pushed to a public GitHub repo (`lumos94/series-tracker`). `com.gxenofontos.tvapp` embeds the developer's name in a now-public identifier, so it was renamed to `com.greplay.watchlog`. Since there were still no real installs depending on the old package name, this was a cheap fix to make while it still was:

1. `app.json` → `android.package` set to `com.greplay.watchlog`.
2. `expo prebuild -p android --clean` to regenerate the native project from the new package name.
3. Reapplied the `signingConfigs.release` block to the freshly-regenerated `android/app/build.gradle` (wiped by the clean prebuild, as always).
4. Updated the **package name** field (only) on both existing Google OAuth Android clients (debug and release) to `com.greplay.watchlog` — their SHA-1s didn't change, so no new clients were needed.
5. Rebuilt with `./gradlew assembleRelease`, uninstalled the old `com.gxenofontos.tvapp` install from the emulator (Android treats a different package name as a different app — no in-place update), and installed the new build.
6. Verified: app launches under the new package, and "Restore from Drive" successfully signs in and hits the Drive API — confirming the OAuth client package-name update took effect.

## Icon & splash

Replaced the default Expo template icon (blue background, white chevron) with a custom mark: a rounded TV/monitor outline with a play triangle inside, and a small teal checkmark badge overlapping the bottom-right corner ("a show, watched/logged"). Background is a diagonal violet gradient (`#4B3593` → `#7B5CE0`), matching the splash screen background color.

<details>
<summary>How the assets were generated</summary>

No design tool was available in that environment, so the icon was built as hand-written SVG (screen outline + triangle + badge, precise coordinates) and rasterized with `rsvg-convert` (from Homebrew's `librsvg`) into every size Expo expects:

- `icon.png` (1024×1024, standalone/store icon)
- `android-icon-foreground.png` / `android-icon-background.png` (512×512, Android adaptive icon layers)
- `android-icon-monochrome.png` (432×432, single-color silhouette for Android 13+ themed icons — the checkmark is punched out as a real transparent hole via an SVG mask, not just a differently-colored fill, since monochrome icons only carry alpha, not color)
- `splash-icon.png` (tight-cropped glyph only, transparent background)
- `favicon.png` (48×48, web)

Glyph placement was worked out by hand against Android's adaptive-icon "safe zone" (the inner ~66%-diameter circle guaranteed visible under any launcher mask) and verified by compositing the layers and simulating a worst-case circular mask before committing to the final coordinates.

</details>

## EAS (set up, but not the build path actually used)

- Created an Expo account, linked the project via `eas init` (project id `51253034-7e1c-4099-993b-ab1e052f2174`, owner `georgexreplays-team`).
- Added `eas.json` with a `preview` profile (internal distribution, `buildType: apk`) and a `production` profile (`app-bundle`, `autoIncrement`).
- Registered `EXPO_PUBLIC_TMDB_API_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` as EAS environment variables (all three environments) — required, since EAS cloud builds don't read the local `.env.local` file.

> Two separate EAS cloud build attempts each got stuck in `IN_QUEUE` for 55+ minutes with zero status change (free-tier queue congestion, not a project-specific error). Cancelled both and built locally instead. EAS remains fully configured if cloud builds are wanted again later (e.g. once account limits/priority allow, or for the `production` app-bundle profile for Play Store distribution).

## Local release build (the path actually used)

1. Generated a **new** release keystore at the project root: `release.keystore` (alias `watchlog-release`), gitignored — separate from both the debug keystore and any EAS-managed one.
2. Wired it into `android/app/build.gradle` as a new `signingConfigs.release`, and pointed `buildTypes.release.signingConfig` at it.
3. Built with `cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk` (~112–117MB).

> **Back up `release.keystore`** somewhere durable (password manager, private cloud storage) — it currently exists only on the dev machine. If it's lost, no future build can be signed to install *over* this same app; users would need to uninstall and reinstall from scratch (losing local data unless restored from Drive first).

> `android/` is gitignored and fully regenerated by `expo prebuild -p android --clean` (needed whenever `app.json`'s icon/name/native config changes). That command wipes the manual `build.gradle` signing edit above — if prebuild is ever re-run with `--clean`, the `signingConfigs.release` block needs to be re-added before `assembleRelease` will produce a correctly-signed release build again.

**Release keystore SHA-1** (registered as the second Android OAuth client — see [google-drive-backup.md](google-drive-backup.md)): `A7:D3:59:E3:0F:CC:55:F9:46:83:36:3A:0F:F2:70:3A:E9:83:07:74`

## Verified

- New icon/name ("Watchlog") shows correctly in the app drawer and dev menu.
- Release APK installs and **launches standalone** — no Metro/dev-client connection needed.
- TMDB search works in the release build (confirms `EXPO_PUBLIC_TMDB_API_KEY` was correctly baked in via the local Gradle bundle step).
- Google Sign-In + Drive backup work in the release build after registering its SHA-1 — "Backup now" completed and updated the last-synced timestamp.

## Not yet done

- Installing the release APK on an actual phone (only tested on the emulator so far).
