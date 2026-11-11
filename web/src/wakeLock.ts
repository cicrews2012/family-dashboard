import { useEffect, useState } from "react";

const KEY = "fd.stayAwake";

/** Default: on for tablets and bigger screens, off for phones. Remembered per device. */
function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved !== null) return saved === "1";
  } catch {
    /* storage blocked */
  }
  return Math.min(window.screen.width, window.screen.height) >= 700;
}

export const wakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Keeps the screen on while the dashboard is open. The browser drops the lock
 * whenever the page is hidden (screen off, app switched), so it is requested
 * again every time the page becomes visible.
 */
export function useStayAwake(): [boolean, (on: boolean) => void, boolean] {
  const [on, setOn] = useState(initial);
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, on ? "1" : "0");
    } catch {
      /* storage blocked */
    }
    if (!on || !wakeLockSupported) {
      setActive(false);
      return;
    }

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release();
          return;
        }
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false); // e.g. low power mode; try again on the next tap or wake
      }
    };

    acquire();
    document.addEventListener("visibilitychange", acquire);
    window.addEventListener("focus", acquire);
    document.addEventListener("pointerdown", acquire);
    const retry = setInterval(acquire, 60_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      window.removeEventListener("focus", acquire);
      document.removeEventListener("pointerdown", acquire);
      clearInterval(retry);
      lock?.release().catch(() => {});
    };
  }, [on]);

  return [on, setOn, active];
}
