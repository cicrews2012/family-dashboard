/**
 * Family dashboard API — a small Cloudflare Worker.
 *
 * - Holds the Google refresh token (as a Worker secret) so the dashboard
 *   never gets signed out, the way Skylight-style frames work.
 * - Serves read-only events + named color labels from ONE Google Calendar
 *   to devices that present a device key.
 *
 * Routes
 *   GET  /health                      -> "ok"
 *   GET  /setup?key=SETUP_KEY         -> one-time Google sign-in page
 *   GET  /auth/start?key=SETUP_KEY    -> redirects to Google consent
 *   GET  /auth/callback               -> shows the refresh token to save as a secret
 *   GET  /api/events?start=ISO&end=ISO  (Authorization: Bearer <device key>)
 */

export interface Env {
  CALENDAR_ID: string;
  ALLOWED_ORIGINS: string; // comma-separated, e.g. "https://cicrews2012.github.io"
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN?: string;
  SETUP_KEY: string;
  DEVICE_KEYS: string; // comma-separated
  API_VERSION?: string; // set by the deploy workflow
}

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const CAL_API = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

const EVENT_CACHE_MS = 30_000; // many screens waking at once -> one Google call
const MAX_RANGE_DAYS = 62;

// Per-isolate caches (best effort; Workers may recycle isolates at any time).
let accessTokenCache: { token: string; expiresAt: number } | null = null;
const eventCache = new Map<string, { at: number; body: string }>();

export interface Label {
  id: string;
  name: string;
  color: string | null;
}

export interface DashEvent {
  id: string;
  title: string;
  start: string; // RFC3339 dateTime, or YYYY-MM-DD for all-day
  end: string;
  allDay: boolean;
  location: string | null;
  labelId: string | null;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      switch (url.pathname) {
        case "/":
        case "/health":
          return text(`ok ${env.API_VERSION ?? "dev"}`);
        case "/setup":
          return setupPage(url, env);
        case "/auth/start":
          return authStart(url, env);
        case "/auth/callback":
          return await authCallback(req, url, env);
        case "/api/events":
          return await withCors(req, env, () => eventsHandler(req, url, env));
        default:
          return text("Not found", 404);
      }
    } catch (err) {
      if (err instanceof HttpError) {
        return url.pathname.startsWith("/api/")
          ? corsJson(req, env, { error: err.message }, err.status)
          : text(err.message, err.status);
      }
      console.error(err);
      return text("Server error", 500);
    }
  },
};

/* ------------------------------------------------------------------ */
/* Setup: one-time Google sign-in to get a refresh token               */
/* ------------------------------------------------------------------ */

function requireSetupKey(url: URL, env: Env) {
  const key = url.searchParams.get("key") ?? "";
  if (!env.SETUP_KEY || !safeEqual(key, env.SETUP_KEY)) {
    throw new HttpError(403, "Forbidden: add ?key=<SETUP_KEY> to the URL.");
  }
}

function setupPage(url: URL, env: Env): Response {
  requireSetupKey(url, env);
  const missing = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "DEVICE_KEYS"].filter(
    (k) => !(env as unknown as Record<string, string | undefined>)[k],
  );
  const redirect = `${url.origin}/auth/callback`;
  const startHref = `/auth/start?key=${encodeURIComponent(url.searchParams.get("key") ?? "")}`;
  return html(`
    <h1>Family dashboard setup</h1>
    <p>Calendar: <code>${esc(env.CALENDAR_ID)}</code></p>
    <p>Google refresh token: <b>${env.GOOGLE_REFRESH_TOKEN ? "saved" : "not saved yet"}</b></p>
    ${missing.length ? `<p class="warn">Missing Worker secrets: ${missing.map(esc).join(", ")}</p>` : ""}
    <p>Make sure this redirect URI is on your Google OAuth client:<br><code>${esc(redirect)}</code></p>
    <p><a class="btn" href="${esc(startHref)}">Sign in with Google</a></p>
  `);
}

function authStart(url: URL, env: Env): Response {
  requireSetupKey(url, env);
  if (!env.GOOGLE_CLIENT_ID) throw new HttpError(500, "GOOGLE_CLIENT_ID secret is not set.");
  const state = randomHex(16);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // always return one, even on re-setup
    state,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${AUTH_URL}?${params}`,
      "Set-Cookie": `fd_state=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}

async function authCallback(req: Request, url: URL, env: Env): Promise<Response> {
  const cookieState = /(?:^|;\s*)fd_state=([a-f0-9]+)/.exec(req.headers.get("Cookie") ?? "")?.[1];
  const state = url.searchParams.get("state") ?? "";
  if (!cookieState || !safeEqual(cookieState, state)) {
    throw new HttpError(400, "Sign-in expired or was started elsewhere. Start again from /setup.");
  }
  const oauthError = url.searchParams.get("error");
  if (oauthError) throw new HttpError(400, `Google returned an error: ${oauthError}`);
  const code = url.searchParams.get("code");
  if (!code) throw new HttpError(400, "No authorization code returned.");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/callback`,
      grant_type: "authorization_code",
    }),
  });
  const tok = (await res.json()) as { access_token?: string; refresh_token?: string; error?: string };
  if (!res.ok || !tok.access_token) {
    throw new HttpError(400, `Token exchange failed: ${tok.error ?? res.status}`);
  }
  if (!tok.refresh_token) {
    throw new HttpError(
      400,
      "Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and try again.",
    );
  }

  // Prove it works: read the label names from the calendar.
  let labelsHtml = "";
  try {
    const labels = await fetchLabels(env, tok.access_token);
    labelsHtml = labels.length
      ? `<p>Labels found on the calendar:</p><ul>${labels
          .map((l) => `<li><span class="dot" style="background:${esc(l.color ?? "#999")}"></span>${esc(l.name || "(no name)")}</li>`)
          .join("")}</ul>`
      : `<p class="warn">Signed in, but no named labels came back for this calendar.</p>`;
  } catch (e) {
    labelsHtml = `<p class="warn">Signed in, but reading the calendar failed: ${esc(String((e as Error).message))}</p>`;
  }

  const res2 = html(`
    <h1>Signed in</h1>
    ${labelsHtml}
    <p><b>Last step:</b> in Cloudflare, open the <code>family-dashboard-api</code> Worker →
       Settings → Variables and Secrets → add a <b>Secret</b> named
       <code>GOOGLE_REFRESH_TOKEN</code> with this value, then deploy:</p>
    <textarea readonly rows="4" onclick="this.select()">${esc(tok.refresh_token)}</textarea>
    <p class="muted">Treat this like a password. Close this page once it's saved.</p>
  `);
  res2.headers.append("Set-Cookie", "fd_state=; Path=/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return res2;
}

/* ------------------------------------------------------------------ */
/* Events API                                                          */
/* ------------------------------------------------------------------ */

async function eventsHandler(req: Request, url: URL, env: Env): Promise<Response> {
  requireDeviceKey(req, env);

  const start = parseDate(url.searchParams.get("start"), "start");
  const end = parseDate(url.searchParams.get("end"), "end");
  if (end <= start) throw new HttpError(400, "end must be after start");
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 86_400_000) {
    throw new HttpError(400, `Range is limited to ${MAX_RANGE_DAYS} days`);
  }

  const cacheKey = `${start.toISOString()}|${end.toISOString()}`;
  const hit = eventCache.get(cacheKey);
  if (hit && Date.now() - hit.at < EVENT_CACHE_MS) {
    return corsRaw(req, env, hit.body);
  }

  const accessToken = await getAccessToken(env);
  const [labels, events] = await Promise.all([
    fetchLabels(env, accessToken),
    fetchEvents(env, accessToken, start, end),
  ]);
  const body = JSON.stringify({ labels, events, fetchedAt: new Date().toISOString(), apiVersion: env.API_VERSION ?? "dev" });

  eventCache.set(cacheKey, { at: Date.now(), body });
  if (eventCache.size > 50) eventCache.delete(eventCache.keys().next().value as string);
  return corsRaw(req, env, body);
}

function requireDeviceKey(req: Request, env: Env) {
  const header = req.headers.get("Authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const keys = (env.DEVICE_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (!presented || !keys.some((k) => safeEqual(k, presented))) {
    throw new HttpError(401, "Device key missing or not recognized.");
  }
}

function parseDate(value: string | null, name: string): Date {
  const d = value ? new Date(value) : new Date(NaN);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `Invalid or missing ${name}`);
  return d;
}

async function getAccessToken(env: Env): Promise<string> {
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt) return accessTokenCache.token;
  if (!env.GOOGLE_REFRESH_TOKEN) {
    throw new HttpError(503, "Google isn't connected yet. Run the /setup page once.");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const tok = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !tok.access_token) {
    if (tok.error === "invalid_grant") {
      throw new HttpError(503, "Google sign-in was revoked or expired. Run the /setup page again.");
    }
    throw new HttpError(502, `Couldn't refresh Google access (${tok.error ?? res.status}).`);
  }
  accessTokenCache = {
    token: tok.access_token,
    expiresAt: Date.now() + Math.max(60, (tok.expires_in ?? 3600) - 120) * 1000,
  };
  return tok.access_token;
}

async function googleGet<T>(path: string, params: Record<string, string>, accessToken: string): Promise<T> {
  const res = await fetch(`${CAL_API}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    if (res.status === 401) accessTokenCache = null;
    const detail = await res.text().catch(() => "");
    console.error("Google API error", res.status, detail.slice(0, 500));
    if (res.status === 404) throw new HttpError(502, "Calendar not found. Check CALENDAR_ID in wrangler.toml.");
    throw new HttpError(502, `Google Calendar returned ${res.status}.`);
  }
  return (await res.json()) as T;
}

interface GCalendar {
  labelProperties?: {
    eventLabels?: Array<{ id?: string; name?: string; backgroundColor?: string }>;
  };
}

export async function fetchLabels(env: Env, accessToken: string): Promise<Label[]> {
  const cal = await googleGet<GCalendar>(
    `/calendars/${encodeURIComponent(env.CALENDAR_ID)}`,
    { eventLabelVersion: "1" },
    accessToken,
  );
  return normalizeLabels(cal);
}

export function normalizeLabels(cal: GCalendar): Label[] {
  return (cal.labelProperties?.eventLabels ?? [])
    .filter((l) => l.id)
    .map((l) => ({ id: String(l.id), name: (l.name ?? "").trim(), color: l.backgroundColor ?? null }));
}

interface GEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  eventLabelId?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

async function fetchEvents(env: Env, accessToken: string, start: Date, end: Date): Promise<DashEvent[]> {
  const out: DashEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page++) {
    const params: Record<string, string> = {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: "true", // expand recurring events into occurrences
      orderBy: "startTime",
      maxResults: "250",
      eventLabelVersion: "1",
    };
    if (pageToken) params.pageToken = pageToken;
    const data = await googleGet<{ items?: GEvent[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events`,
      params,
      accessToken,
    );
    for (const e of data.items ?? []) {
      const n = normalizeEvent(e);
      if (n) out.push(n);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

export function normalizeEvent(e: GEvent): DashEvent | null {
  if (e.status === "cancelled") return null;
  const start = e.start?.dateTime ?? e.start?.date;
  const end = e.end?.dateTime ?? e.end?.date ?? start;
  if (!start || !end) return null;
  return {
    id: e.id,
    title: (e.summary ?? "").trim() || "(No title)",
    start,
    end,
    allDay: !e.start?.dateTime,
    location: e.location?.trim() || null,
    labelId: e.eventLabelId || null,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function allowedOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  const isLocalDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return allowed.includes(origin) || isLocalDev ? origin : null;
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = allowedOrigin(req, env);
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : { Vary: "Origin" };
}

async function withCors(req: Request, env: Env, fn: () => Promise<Response>): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req, env) });
  if (req.method !== "GET") throw new HttpError(405, "Method not allowed");
  return fn();
}

function corsRaw(req: Request, env: Env, body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders(req, env) },
  });
}

function corsJson(req: Request, env: Env, data: unknown, status = 200): Response {
  return corsRaw(req, env, JSON.stringify(data), status);
}

function text(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function html(body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Family dashboard setup</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#222}
code{background:#f2f2f2;padding:2px 5px;border-radius:4px;word-break:break-all}
.btn{display:inline-block;background:#1a73e8;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none}
.warn{color:#a33}.muted{color:#777}textarea{width:100%;font:13px monospace}
.dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;vertical-align:-1px}</style>
</head><body>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-aware constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const len = Math.max(ea.length, eb.length);
  for (let i = 0; i < len; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}
