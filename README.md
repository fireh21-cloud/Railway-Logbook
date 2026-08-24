# RailwayLogbook

A personal duty-record PWA for a Loco Pilot — train movement/shunting timelines,
locomotive status checks, schedule info, and a shareable duty-card export.
Runs entirely as a home-screen web app: no Xcode, no Apple Developer account,
no App Store, ₹0 cost.

## What it is

- Plain HTML/CSS/JS, no build step, no framework, no npm install needed to run it.
- Data lives in IndexedDB on the device — autosaves as you type (debounced ~400ms,
  with an immediate flush whenever the app is backgrounded, so a crash loses at
  most a fraction of a second of the very last edit).
- Installable via Safari's "Add to Home Screen" — opens full-screen with its own
  icon, works fully offline once installed (a Service Worker caches the app shell).
- Optional daily backup to your own Google Drive (JSON file, visible in a
  "RailwayLogbook Backups" folder you can browse yourself).

## Run it locally

No install required beyond Python (already on most machines):

```
cd RailwayLogbook
python -m http.server 8080
```

Open `http://localhost:8080` in a browser. That's the whole dev loop — edit a
file, refresh.

## Host it for free (so it can be installed on your iPhone)

A Service Worker requires HTTPS, so `localhost` testing is fine but the real
phone install needs real hosting. **GitHub Pages** is recommended — free,
HTTPS by default, no payment method required:

1. Create a GitHub account if you don't have one (free).
2. Create a new repository, e.g. `railwaylogbook`, and push this folder's
   contents to it (root of the repo = root of the site).
3. In the repo's Settings → Pages, set Source to "Deploy from branch",
   branch `main`, folder `/ (root)`.
4. After a minute or two your app is live at
   `https://<your-username>.github.io/railwaylogbook/`.

Any static HTTPS host works the same way (Netlify, Vercel, Cloudflare Pages) —
GitHub Pages is just the simplest with zero signup friction.

## Install on your iPhone 15 Plus

1. Open the hosted URL in **Safari** (must be Safari, not Chrome — only Safari
   can install PWAs to the home screen on iOS).
2. Tap the Share icon → **Add to Home Screen**.
3. Open it from the home screen icon from now on — it runs full-screen like a
   native app, works offline, and its local storage is exempt from Safari's
   usual 7-day data-eviction policy specifically because it's an installed
   home-screen app (Apple carves this out for exactly this use case).

No Mac, no Xcode, no Apple ID, no 7-day re-signing — none of that applies here,
because this was never installed the native-iOS-app way.

## First launch

You'll be asked for your name once (auto-fills the "Pilot" field on every
exported duty card, editable later in Settings). Then:

1. **Locomotives tab** — add the locomotives you work with (number, class, shed).
2. **Duty Log tab** — tap **+** for each duty. Timeline-of-working fields
   (Loco Takeover, Loco Offer, etc.) start as a "Tap to set" button — the first
   tap fills in the current time and turns it into an editable time field, so a
   live entry is one tap and a retrospective one is a quick edit.
3. Tap the ⇪ icon on an entry to generate/share its duty card image.

## Setting up Google Drive backup (optional but recommended)

Backup only reliably triggers when the app is actually opened/closed (iOS
Safari has no guaranteed silent-background-task API the way a native app
would) — in practice this means every time you open the app after a duty,
which is the realistic usage pattern anyway. There's also a manual
**Backup Now** button in Settings as a guaranteed fallback.

To connect it:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a
   new project (free).
2. **APIs & Services → Library** → enable the **Google Drive API**.
3. **APIs & Services → OAuth consent screen** → set it up as "External",
   fill in the required fields (app name, your email) — you can leave it in
   "Testing" mode and add your own Google account as a test user, since this
   is a single-user personal app.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   type **Web application**. Under "Authorized JavaScript origins" add your
   hosted URL (e.g. `https://<your-username>.github.io`). No redirect URI
   needed.
5. Copy the generated **Client ID**, paste it into RailwayLogbook's
   **Settings → OAuth Client ID** field, then tap **Connect Google Drive**.

Backups land in a normal, visible "RailwayLogbook Backups" folder in your
Drive — one dated JSON file per day, updated in place if you back up again
same-day.

**Note**: Safari's cross-site tracking prevention can occasionally require you
to reconnect (tap Connect again) rather than silently refreshing in the
background — this is a known iOS Safari limitation for the underlying Google
Sign-In library, not an app bug.

### Restoring

Settings → **Restore from Backup** lists your dated backups in Drive; picking
one fully replaces the data currently on the device (not a merge) — meant for
a fresh install / lost-device scenario.

## Updating the app after changes

Edit files, push to your hosting branch. Bump `CACHE_NAME` in `sw.js` (e.g.
`railwaylogbook-v2`) whenever you change a cached file, so the Service Worker
knows to fetch the new versions instead of serving the old cached copies.

## Dev smoke tests

`scripts/test_app.mjs` and `scripts/test_export.mjs` drive the app with
Playwright (add a locomotive, add a duty entry, confirm autosave/persistence,
render the export card) and report any console errors — useful after making
changes. To run them:

```
cd RailwayLogbook
python -m http.server 8842 &
cd scripts
npm install playwright
npx playwright install chromium
node test_app.mjs
node test_export.mjs
```
