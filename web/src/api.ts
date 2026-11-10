import { API_BASE } from "./config.ts";
import type { ApiResponse } from "./logic.ts";

export class AuthError extends Error {}

export async function fetchEvents(deviceKey: string, start: Date, end: Date): Promise<ApiResponse> {
  if (!API_BASE) throw new Error("No API address set. Add the VITE_API_BASE repo variable and redeploy.");
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  const res = await fetch(`${API_BASE}/api/events?${params}`, {
    headers: { Authorization: `Bearer ${deviceKey}` },
    cache: "no-store",
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error */
  }
  const message = (body as { error?: string } | null)?.error;
  if (res.status === 401) throw new AuthError(message ?? "Device key not recognized.");
  if (!res.ok) throw new Error(message ?? `Server returned ${res.status}`);
  return body as ApiResponse;
}

const KEY = "fd.deviceKey";

export function loadKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveKey(value: string | null) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: key lives in memory for this session */
  }
}
