import { countdown, formatTime, upNext, type DashEvent } from "../logic.ts";
import { useStayAwake, wakeLockSupported } from "../wakeLock.ts";
import { colors, useTheme } from "../theme.ts";
import { APP_COMMIT, APP_VERSION } from "../version.ts";

export type View = "today" | "week" | "month";

interface Props {
  now: Date;
  events: DashEvent[];
  view: View;
  onView: (v: View) => void;
  demo: boolean;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  onRefresh: () => void;
  apiVersion: string | null;
}

export function Header({ now, events, view, onView, demo, loading, error, fetchedAt, onRefresh, apiVersion }: Props) {
  const next = upNext(events, now);
  const updated = fetchedAt ? formatTime(new Date(fetchedAt)) : null;
  const [stayAwake, setStayAwake, awakeActive] = useStayAwake();
  const [theme, cycleTheme] = useTheme();
  return (
    <header className="header">
      <div className="when">
        <div className="clock">{formatTime(now)}</div>
        <div className="date">{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
      </div>

      <div className="next">
        {next ? (
          <>
            <span className="next-label">Up next</span>
            <span className="next-dot" style={{ background: colors(next.person).chip }} />
            <span className="next-title">
              {next.person.name}: {next.title}
            </span>
            <span className="next-time">
              {formatTime(next.startDate)} · {countdown(next.startDate, now)}
            </span>
          </>
        ) : (
          <span className="next-label">Nothing else coming up today</span>
        )}
      </div>

      <div className="controls">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={view === "today"} className={view === "today" ? "on" : ""} onClick={() => onView("today")}>
            Today
          </button>
          <button role="tab" aria-selected={view === "week"} className={view === "week" ? "on" : ""} onClick={() => onView("week")}>
            Week
          </button>
          <button role="tab" aria-selected={view === "month"} className={view === "month" ? "on" : ""} onClick={() => onView("month")}>
            Month
          </button>
        </div>
        <div className="status-row">
          <button className="status awake" onClick={cycleTheme} title="Change light or dark mode">
            {theme === "auto" ? "Theme: auto" : theme === "dark" ? "Dark" : "Light"}
          </button>
          {wakeLockSupported && (
            <button
              className={`status awake${stayAwake ? " on" : ""}`}
              onClick={() => setStayAwake(!stayAwake)}
              aria-pressed={stayAwake}
              title={stayAwake ? "Screen stays on. Tap to let it sleep normally." : "Tap to keep the screen on"}
            >
              {stayAwake ? (awakeActive ? "Screen stays on" : "Screen stays on (tap screen)") : "Screen can sleep"}
            </button>
          )}
          <button className={`status${error ? " bad" : ""}`} onClick={onRefresh} title="Refresh now">
            {demo ? "Demo data" : loading ? "Updating…" : error ? `Offline · ${updated ?? "no data"}` : updated ? `Updated ${updated}` : ""}
          </button>
          <span className="version" title={`Dashboard build ${APP_VERSION} (${APP_COMMIT})${apiVersion ? `, API build ${apiVersion}` : ""}`}>
            v{APP_VERSION}
            {apiVersion ? ` · api ${apiVersion}` : ""}
          </span>
        </div>
      </div>
    </header>
  );
}
