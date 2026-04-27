# Wire Up GitHub Releases Hosting for Desktop Downloads

Goal: Replace the broken placeholder download links on `/download` with real, working URLs pointing to GitHub Releases — and make the page safe so it never 404s again, even if a future release is missing.

---

## Step 1 — You: create the GitHub release (manual, ~5 min)

I'll give you exact steps. You only do this once per release.

1. **Make sure your project is connected to GitHub** (Connectors → GitHub → Connect). Repo can stay **private** — release assets are independently public.
2. Download the three binaries I already built from `/mnt/documents/`:
   - `TrackSideOps-mac.zip`
   - `TrackSideOps-windows.zip`
   - `TrackSideOps-linux.tar.gz`
3. On GitHub: **Releases → Draft a new release**
   - Tag: `v1.0.0`
   - Title: `Track Side Ops Desktop v1.0.0`
   - Drag all three files into the assets area
   - Publish release
4. Copy the repo's `owner/name` (e.g. `yourname/trackside-ops`) and send it to me — that's all I need to wire up the URLs.

GitHub serves release assets over HTTPS from their CDN with **unlimited free bandwidth**, even for private repos.

---

## Step 2 — I: update `src/pages/Download.tsx`

Once you give me the repo path, I'll:

- Add a single `GITHUB_REPO` and `LATEST_VERSION` constant at the top of the file so future releases are a one-line change.
- Build URLs in the form:
  `https://github.com/{owner}/{repo}/releases/download/v1.0.0/TrackSideOps-mac.zip`
- Add a **safety fallback**: if `GITHUB_REPO` is still the placeholder string, the buttons render as a disabled "Coming soon" state instead of 404'ing. This protects the page if anyone ever clears the constant.
- Add a small "View all releases" link under the cards pointing to the GitHub releases page, so power users can grab older versions.

## Step 3 — I: add SHA256 checksums (security best practice)

- Compute SHA256 hashes of the three binaries currently in `/mnt/documents/`.
- Display them under each download button in a small monospace block with a copy button, so security-conscious users can verify the file wasn't tampered with in transit.
- Add a one-line "Why checksums?" tooltip linking to a brief explanation.

## Step 4 — I: document the release workflow

Update `docs/desktop-build.md` with a new "Cutting a new release" section:

1. Rebuild binaries (only needed when the Electron shell changes — window size, icon, welcome modal, etc.)
2. Bump `LATEST_VERSION` in `Download.tsx`
3. Create a new GitHub release with the matching tag and upload the three files
4. (Optional) regenerate SHA256 hashes on the page

For 99% of updates (UI, features, backend, paywall, API keys) you do **nothing** — the live site flows through automatically.

---

## What this does NOT change

- No Electron shell changes
- No backend, RLS, or edge function changes
- No new dependencies in the web `package.json`
- No new routes — `/download` already exists

## What I need from you to start

Just the GitHub repo path (e.g. `yourusername/trackside-ops`) once the release is published. If you'd rather, I can wire it up with a placeholder repo string now and you swap it later — your call.

---

## Files touched

**Edited:** `src/pages/Download.tsx`, `docs/desktop-build.md`
**Not touched:** everything else
