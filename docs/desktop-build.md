# Desktop App — Build & Release Guide

The desktop app is a thin **Electron wrapper** that opens `https://tracksideops.com` in its own native window. Because it loads the live site, **every web update reaches desktop users instantly with no rebuild**.

You only need to rebuild when you change the shell itself: window size, icon, app name, menu, or the URL it loads.

---

## Files

- `electron/main.cjs` — Electron main process (window, menu, single-instance lock, external-link handling)
- `electron/package.json` — minimal manifest used by the packager
- `electron/icon.png` — *(optional)* drop a 512×512 PNG here to brand the app
- `src/pages/Download.tsx` — the user-facing `/download` page that serves the binaries

The web `package.json` is intentionally **not** modified — Electron is heavy and would bloat the web build. Install it on demand only when packaging.

---

## Build the binaries (one-time, then re-run only when shell changes)

From the project root:

```bash
# Install Electron + packager (one-time, ~150MB download)
npm install --no-save electron @electron/packager

# Build all three platforms
npx @electron/packager electron "Track Side Ops" \
  --platform=darwin --arch=x64 --out=electron-release --overwrite

npx @electron/packager electron "Track Side Ops" \
  --platform=win32 --arch=x64 --out=electron-release --overwrite

npx @electron/packager electron "Track Side Ops" \
  --platform=linux --arch=x64 --out=electron-release --overwrite
```

Output lands in `electron-release/`. Archive each:

```bash
cd electron-release
zip -r TrackSideOps-mac.zip     "Track Side Ops-darwin-x64"
zip -r TrackSideOps-windows.zip "Track Side Ops-win32-x64"
tar czf TrackSideOps-linux.tar.gz "Track Side Ops-linux-x64"
```

---

## Hosting the downloads

The `/download` page is wired to **GitHub Releases** — free, unlimited bandwidth, and serves over HTTPS from GitHub's CDN. Your repository can stay private; release assets are independently public.

See "Cutting a new release" below for the exact workflow.

---

## Cutting a new release

The desktop app loads the live site, so you only need to release new binaries when you change the **Electron shell itself** (window size, icon, welcome modal, app name, or the URL it loads). Normal feature/UI/backend updates flow through automatically — do nothing.

When you do need to ship a shell update:

### 1. Rebuild the binaries

Follow the build commands in the section above. You'll end up with:

- `TrackSideOps-mac.zip`
- `TrackSideOps-windows.zip`
- `TrackSideOps-linux.tar.gz`

### 2. Compute new SHA256 checksums

```bash
shasum -a 256 TrackSideOps-mac.zip TrackSideOps-windows.zip TrackSideOps-linux.tar.gz
```

Copy the three hashes — you'll paste them into `src/pages/Download.tsx`.

### 3. Publish on GitHub Releases

1. Go to your repo on GitHub → **Releases → Draft a new release**
2. Tag: `v1.0.0` (bump the version each release: `v1.0.1`, `v1.1.0`, etc.)
3. Title: `Track Side Ops Desktop v1.0.0`
4. Drag all three binary files into the assets area
5. Click **Publish release**

The asset URLs will follow this pattern automatically:
`https://github.com/{owner}/{repo}/releases/download/v1.0.0/TrackSideOps-mac.zip`

### 4. Wire it up in the app

Open `src/pages/Download.tsx` and update the constants at the top of the file:

```ts
const GITHUB_REPO = "yourname/trackside-ops"; // your repo path
const LATEST_VERSION = "1.0.0";               // matches the GitHub tag (without the "v")
```

Then update each platform's `sha256` field with the hashes from step 2.

That's it — the page automatically:
- Builds the correct download URLs from the constants
- Shows the version number under the hero
- Adds a "View all releases on GitHub" link below the cards

### Safety net

If `GITHUB_REPO` is left empty (`""`), the page automatically falls back to a "Coming soon" state with disabled buttons — so it can never silently 404. This is the default until your first real release.

---

## Why GitHub Releases?

- **Free, unlimited bandwidth** — even for large binaries
- **Repo stays private** — only the files you attach to a release are public
- **HTTPS + CDN** — fast, secure downloads worldwide
- **Versioned** — old releases stay accessible
- **Industry standard** — VS Code, Obsidian, Signal, Discord all distribute desktop apps this way

---

## Custom app icon

1. Create a 1024×1024 PNG of the Track Side logo on a solid background.
2. Save it as `electron/icon.png`.
3. *(Optional, better quality)* convert to platform-native formats and pass `--icon=`:
   - macOS: `.icns` → `--icon=electron/icon.icns`
   - Windows: `.ico` → `--icon=electron/icon.ico`
   - Linux: `.png` is fine
4. Rebuild.

---

## Local testing

```bash
npm install --no-save electron
npx electron electron/
```

A native window opens on your machine loading the live site.

---

## Code signing (later, optional)

Unsigned builds work fine but show a one-time warning:

- **macOS**: right-click → Open the first time. To remove the warning, you need an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/yr) and to sign + notarize on a real Mac.
- **Windows**: SmartScreen says "Windows protected your PC" → click "More info → Run anyway". To remove, buy an EV code-signing certificate (~$200–400/yr) and sign with `signtool`.
- **Linux**: no warning.

You can ship unsigned builds indefinitely — most indie apps do. Sign once you have paying customers.

---

## How updates work

| You change… | Desktop users get it… |
|---|---|
| React UI / new pages / bug fixes | Instantly on next app launch |
| Edge functions / DB migrations / RLS | Instantly (shared backend) |
| New API keys / Stripe paywall / connectors | Instantly |
| Anything in `electron/main.cjs` (window, menu, icon, URL) | Only then do you rebuild & re-host the binaries |

The same model applies to the future iOS/Android apps via Median.co — one web codebase, three thin native wrappers.