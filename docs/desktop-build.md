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

The `/download` page links to `/downloads/TrackSideOps-{mac,windows,linux}.{zip,tar.gz}`.

Pick one of:

1. **Lovable Cloud Storage** *(recommended)*: upload the three files to a public bucket and point the links at the bucket URLs. Edit `src/pages/Download.tsx` and replace each `file: "/downloads/..."` with the bucket URL.
2. **GitHub Releases**: create a release, attach the three files, replace the URLs with the release asset URLs.
3. **Static `public/downloads/`**: drop the files into `public/downloads/` and they'll ship with the web app. *(Not recommended — they're 150–200MB each and bloat every web deploy.)*

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