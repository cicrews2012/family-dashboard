import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthError, fetchEvents, loadKey, saveKey } from "./api.ts";
import { NIGHT_END, NIGHT_START, REFRESH_MS, WEEK_DAYS } from "./config.ts";
import { demoData } from "./demo.ts";
import { addDays, isNight, monthGrid, prepare, startOfDay, type ApiResponse } from "./logic.ts";
import { Header, type View } from "./components/Header.tsx";
import { TodayBoard } from "./components/TodayBoard.tsx";
import { WeekView } from "./components/WeekView.tsx";
import { MonthView } from "./components/MonthView.tsx";
import { KeyPrompt } from "./components/KeyPrompt.tsx";

/** Read ?key=… or ?demo once, then tidy the address bar. */
function initialAuth(): { key: string | null; demo: boolean } {
  const params = new URLSearchParams(location.search);
  const demo = params.has("demo");
  const urlKey = params.get("key");
  if (urlKey) saveKey(urlKey);
  if (urlKey) {
    params.delete("key");
    const qs = params.toString();
    history.replaceState(null, "", location.pathname + (qs ? `?${qs}` : ""));
  }
  return { key: urlKey ?? loadKey(), demo };
}

function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const wake = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [intervalMs]);
  return now;
}

export default function App() {
  const [{ key, demo }, setAuth] = useState(initialAuth);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("today");
  const [boardOffset, setBoardOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [monthData, setMonthData] = useState<{ key: string; data: ApiResponse } | null>(null);
  const now = useNow();
  const today = startOfDay(now);
  const dayKey = today.getTime(); // changes at midnight -> refetch
  const lastFetch = useRef(0);

  const load = useCallback(async () => {
    const start = new Date(dayKey);
    const end = addDays(start, WEEK_DAYS);
    if (demo) {
      setData(demoData(new Date()));
      setError(null);
      return;
    }
    if (!key) return;
    setLoading(true);
    try {
      const res = await fetchEvents(key, start, end);
      setData(res);
      setError(null);
      lastFetch.current = Date.now();
    } catch (e) {
      if (e instanceof AuthError) {
        saveKey(null);
        setAuthError(e.message);
        setAuth({ key: null, demo: false });
      } else {
        setError((e as Error).message || "Couldn't refresh");
      }
    } finally {
      setLoading(false);
    }
  }, [key, demo, dayKey]);

  // Initial load, midnight rollover, and the regular refresh.
  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Month view has its own fetch, for whichever month is on screen.
  const monthStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthKey = `${monthStart.getFullYear()}-${monthStart.getMonth()}`;
  const loadMonth = useCallback(async () => {
    if (view !== "month") return;
    const grid = monthGrid(monthStart);
    if (demo) {
      setMonthData({ key: monthKey, data: demoData(new Date()) });
      return;
    }
    if (!key) return;
    try {
      const res = await fetchEvents(key, grid[0], addDays(grid[grid.length - 1], 1));
      setMonthData({ key: monthKey, data: res });
    } catch (e) {
      if (!(e instanceof AuthError)) setError((e as Error).message || "Couldn't load the month");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, monthKey, key, demo]);

  useEffect(() => {
    loadMonth();
    const id = setInterval(loadMonth, REFRESH_MS);
    const wake = () => document.visibilityState === "visible" && loadMonth();
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [loadMonth]);

  // Refresh right away when the screen wakes up or the network comes back.
  useEffect(() => {
    const maybe = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetch.current > 30_000) load();
    };
    document.addEventListener("visibilitychange", maybe);
    window.addEventListener("online", maybe);
    window.addEventListener("focus", maybe);
    return () => {
      document.removeEventListener("visibilitychange", maybe);
      window.removeEventListener("online", maybe);
      window.removeEventListener("focus", maybe);
    };
  }, [load]);

  const events = useMemo(() => (data ? prepare(data) : []), [data]);
  const monthEvents = useMemo(
    () => (monthData && monthData.key === monthKey ? prepare(monthData.data) : null),
    [monthData, monthKey],
  );
  const night = isNight(now, NIGHT_START, NIGHT_END);

  if (!key && !demo) {
    return (
      <KeyPrompt
        message={authError}
        onSave={(k) => {
          saveKey(k);
          setAuthError(null);
          setAuth({ key: k, demo: false });
        }}
        onDemo={() => setAuth({ key: null, demo: true })}
      />
    );
  }

  return (
    <div className={`app${night ? " night" : ""}`}>
      <Header
        now={now}
        events={events}
        view={view}
        onView={setView}
        demo={demo}
        loading={loading}
        error={error}
        fetchedAt={data?.fetchedAt ?? null}
        onRefresh={() => {
          load();
          loadMonth();
        }}
      />
      {!data && !error && <p className="loading">Loading the calendar…</p>}
      {!data && error && <p className="loading">{error}</p>}
      {data && view === "today" && (
        <TodayBoard events={events} day={addDays(today, boardOffset)} offset={boardOffset} onOffset={setBoardOffset} />
      )}
      {data && view === "week" && <WeekView events={events} today={today} now={now} />}
      {data && view === "month" && (
        <MonthView events={monthEvents} month={monthStart} today={today} offset={monthOffset} onOffset={setMonthOffset} />
      )}
    </div>
  );
}
