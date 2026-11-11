import { useEffect } from "react";

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
export const APP_COMMIT: string = typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "local";

const CHECK_MS = 5 * 60 * 1000;
const TRIED = "fd.reloadTried";

/**
 * A Home Screen app stays open for days and never reloads by itself, so it keeps
 * running whatever version it first loaded. This checks version.json and reloads
 * when a newer deploy is live. The ?v= on the reload makes iOS fetch a fresh page
 * instead of its cached copy.
 */
export function useAutoUpdate() {
  useEffect(() => {
    if (APP_VERSION === "dev") return;

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version?: string };
        if (!version || version === APP_VERSION) return;

        // Don't loop if the new page somehow still comes back old: one try per version per 10 min.
        let tried: { v?: string; at?: number } = {};
        try {
          tried = JSON.parse(sessionStorage.getItem(TRIED) ?? "{}");
        } catch {
          /* ignore */
        }
        if (tried.v === version && Date.now() - (tried.at ?? 0) < 10 * 60 * 1000) return;
        try {
          sessionStorage.setItem(TRIED, JSON.stringify({ v: version, at: Date.now() }));
        } catch {
          /* ignore */
        }

        const params = new URLSearchParams(location.search);
        params.set("v", version);
        location.replace(`${location.pathname}?${params}`);
      } catch {
        /* offline: try again later */
      }
    };

    check();
    const id = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}
