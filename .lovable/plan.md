
# Desktop App via Electron — Implementation Plan

Goal: Ship a downloadable desktop app for **macOS, Windows, and Linux** that opens Track Side Ops in a native window. The shell loads `https://tracksideops.com` directly, so every web update (UI, features, bug fixes, paywalls, new API keys, etc.) appears instantly in the desktop app with **no rebuild required**.

This is purely additive — no existing code, routes, edge functions, or database logic change.

---

## 1. Electron shell

**New file: `electron/main.cjs`** (CommonJS — required because `package.json` has `"type": "module"`)

- Creates a `BrowserWindow` (1280×800, min 1024×640) with:
  - `contextIsolation: true`, `nodeIntegration: false` (secure defaults)
  - App title "Track Side Ops"
  - Loads `https://tracksideops.com` directly
- External links (`target="_blank"`, `mailto:`, etc.) open in the user's default browser via `shell.openExternal`
- Native menu bar (File / Edit / View / Window / Help) with standard shortcuts (reload, devtools, zoom, quit)
- Single-instance lock so launching twice focuses the existing window
- macOS-friendly: re-create window on `activate`, quit on `window-all-closed` (except darwin)

**Edit: `package.json`**
- Add `"main": "electron/main.cjs"`
- Add scripts:
  - `"electron:dev": "electron ."`
  - `"electron:build:mac": "@electron/packager . 'Track Side Ops' --platform=darwin --arch=x64 --out=electron-release --overwrite"`
  - `"electron:build:win": "@electron/packager . 'Track Side Ops' --platform=win32 --arch=x64 --out=electron-release --overwrite"`
  - `"electron:build:linux": "@electron/packager . 'Track Side Ops' --platform=linux --arch=x64 --out=electron-release --overwrite"`
- Add devDependencies: `electron`, `@electron/packager`

> Note: I'll install via `bun add -d` so the lockfile stays consistent. The shell loads the live URL, so no Vite `base` change is needed (that's only for bundled `file://` builds).

---

## 2. Build the distributable bundles

After the shell is in place, I'll run the three packager commands to produce:

- `Track Side Ops-darwin-x64/` → zipped to `/mnt/documents/TrackSideOps-mac.zip`
- `Track Side Ops-win32-x64/` → zipped to `/mnt/documents/TrackSideOps-windows.zip`
- `Track Side Ops-linux-x64/` → tarred to `/mnt/documents/TrackSideOps-linux.tar.gz`

These are downloadable artifacts you can host anywhere (Lovable Cloud Storage, your own S3, GitHub Releases, etc.).

**Limitations of sandbox builds (transparent up front):**
- macOS: ships as `.zip`, not `.dmg` (no `hdiutil` here). Users unzip and drag to Applications.
- macOS: not code-signed → users right-click → Open the first time. For App Store / Gatekeeper, you'll need an Apple Developer account ($99/yr) and to sign on a real Mac.
- Windows: ships as `.zip` containing `Track Side Ops.exe`, not an `.exe` installer. Not code-signed → SmartScreen warning on first launch. Real signing needs an EV certificate.
- Linux: ships as `.tar.gz`, not `.AppImage`/`.deb`.

These are fine for direct distribution from your site. Store-grade installers can come later.

---

## 3. In-app download page

**New file: `src/pages/Download.tsx`** — clean page matching the Landing aesthetic with:
- Three platform cards (macOS, Windows, Linux) with download buttons
- "What's this?" explainer: same app as the web, runs in its own window, auto-updates with the website
- Mobile section: "iOS and Android coming soon via Median.co" (placeholder so you can drop links in later)
- Install instructions per platform (unzip → move to Applications / Program Files / `~/Applications`)

**Edit: `src/App.tsx`** — register `/download` route (public, no auth required).

**Edit: `src/pages/Landing.tsx`** — add a small "Download the desktop app" link in the nav and a CTA button in the footer.

> Download URLs will be placeholders (`/downloads/TrackSideOps-mac.zip` etc.) that you'll point at wherever you host the artifacts. I'll document this clearly on the page and in the build doc.

---

## 4. Documentation

**New file: `docs/desktop-build.md`** covering:
- How to run `npm run electron:dev` locally to test
- How to rebuild the bundles when you ever change the shell (window size, icon, app name)
- How to host the resulting files (Lovable Cloud Storage bucket, GitHub Releases, etc.)
- How to add a custom app icon (drop `.icns` / `.ico` / `.png` into `electron/`, reference via `--icon=` flag)
- Code-signing pointers for when you're ready to remove the "unidentified developer" warnings

---

## How updates work after this ships

| You change… | Desktop users get it… |
|---|---|
| UI / React components | **Instantly** on next app launch (loads live site) |
| New page or feature | **Instantly** |
| Edge function / DB migration | **Instantly** (backend is shared) |
| New API keys / connectors / Stripe paywall | **Instantly** |
| Electron shell itself (window size, icon, app name) | Only then do you rebuild + redistribute the `.zip`/`.tar.gz` |

Same model Median.co will use for iOS/Android — one web codebase, three thin wrappers.

---

## Files touched

**New:** `electron/main.cjs`, `src/pages/Download.tsx`, `docs/desktop-build.md`
**Edited:** `package.json`, `src/App.tsx`, `src/pages/Landing.tsx`
**Generated artifacts (in `/mnt/documents/`):** `TrackSideOps-mac.zip`, `TrackSideOps-windows.zip`, `TrackSideOps-linux.tar.gz`

**Not touched:** any existing route, context, edge function, migration, RLS policy, or component. Zero risk to current functionality.
