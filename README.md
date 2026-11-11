# Family dashboard

A homemade, subscription-free family wall calendar. Everyone adds events in Google Calendar on their phone; this dashboard shows them on an iPad (or any screen) as a **Today** sticky-note board and a **Week** view, color-coded by person.

```
Google Calendar (one Family calendar, named color labels)
        │  read-only, refresh token kept server-side
        ▼
Cloudflare Worker  (worker/)  ── /api/events, needs a device key
        │
        ▼
Dashboard PWA on GitHub Pages  (web/)  ── iPad, wall screen, phones
```

The Worker holds the Google refresh token, so the screen never gets signed out, even after sleeping.

## Try it now

After the first Pages deploy, open
`https://cicrews2012.github.io/family-dashboard/?demo` to see it with sample data.

## One-time setup

### 1. Google Calendar
- One **Family** calendar with named event colors: Christian, Savannah, Emerson, Twins, Family.
- Calendar ID is set in `worker/wrangler.toml`.

### 2. Google Cloud (console.cloud.google.com)
1. Create a project and enable the **Google Calendar API**.
2. OAuth consent screen: External, scope `.../auth/calendar.readonly`, then **Publish app** so it's **In production**.
   *(In "Testing", Google expires refresh tokens after 7 days.)*
3. Credentials → **OAuth client ID** → Web application. Keep the client ID and secret handy.

### 3. Cloudflare + GitHub
1. Cloudflare: create an API token from the **Edit Cloudflare Workers** template and note your Account ID.
2. GitHub repo → Settings → Secrets and variables → Actions:
   - **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
3. GitHub repo → Settings → Pages → Source: **GitHub Actions**.

### 4. First deploy
Push to `main` (or run both workflows from the Actions tab). The Worker deploys to
`https://family-dashboard-api.<your-subdomain>.workers.dev`.

### 5. Worker secrets
Cloudflare dashboard → Workers → `family-dashboard-api` → Settings → Variables and Secrets. Add these with **Type: Secret** (not Text: Text values show up in deploy logs and get replaced on deploy):

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | from step 2 |
| `GOOGLE_CLIENT_SECRET` | from step 2 |
| `SETUP_KEY` | a long random string (only for the setup page) |
| `DEVICE_KEYS` | one or more long random strings, comma-separated (one per screen) |

Use your password manager's generator for the random strings.

### 6. Connect Google (once)
1. On the Google OAuth client, add the redirect URI
   `https://family-dashboard-api.<your-subdomain>.workers.dev/auth/callback`.
2. Visit `https://family-dashboard-api.<your-subdomain>.workers.dev/setup?key=<SETUP_KEY>` and sign in with Google.
3. It shows the labels it found and a refresh token. Save that as one more Worker secret: `GOOGLE_REFRESH_TOKEN`.

### 7. Point the dashboard at the Worker
GitHub repo → Settings → Secrets and variables → Actions → **Variables** → add
`VITE_API_BASE` = `https://family-dashboard-api.<your-subdomain>.workers.dev`, then re-run **Deploy dashboard**.

### 8. iPad
1. Open `https://cicrews2012.github.io/family-dashboard/` in Safari and enter a device key.
2. Share → **Add to Home Screen**, then open it from the Home Screen.
3. Settings → Display & Brightness → Auto-Lock: Never (for a wall screen), and Guided Access to pin it.

## Everyday use
- Add events in Google Calendar and pick the person's color. Unlabeled events show under **Family**.
- The screen refreshes every minute and right away when it wakes.
- **Views:** Today (sticky notes), Week, and Month. In Month, use ‹ › to change months and tap a day to see its events.
- **Theme:** tap the theme button to cycle Auto (follows the device's Light/Dark setting), Light, and Dark. Remembered per device.
- It dims between 9pm and 6am.
- **Screen stays on** while the dashboard is open (on by default for tablets, off for phones). Tap the "Screen stays on / can sleep" button to change it per device. Press the power button to sleep it manually.

## Customizing
Everything lives in `web/src/config.ts`: people, colors, label names, the Family fallback, refresh interval, night hours, and the kids' picture icons.

## Managing access
- **Revoke a screen:** remove its key from `DEVICE_KEYS`. That screen falls back to the key prompt.
- **Reconnect Google:** run `/setup` again and replace `GOOGLE_REFRESH_TOKEN`.
- **Cut off Google access entirely:** remove the app at myaccount.google.com/permissions.

## Development
```
cd web && npm install && npm test && npm run build
cd worker && npm install && npm test && npx tsc --noEmit
```
