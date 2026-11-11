import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { colors } from "../theme.ts";
import { kidIcon, timeLabel, type DashEvent } from "../logic.ts";

interface Selected {
  event: DashEvent;
  day: Date;
}

const Ctx = createContext<(event: DashEvent, day: Date) => void>(() => {});

/** Call with an event and the day it was tapped on to show its details. */
export function useOpenEvent() {
  return useContext(Ctx);
}

export function EventDetailsProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<Selected | null>(null);

  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => setSel(null), 60_000); // a wall screen shouldn't stay stuck on a popup
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [sel]);

  return (
    <Ctx.Provider value={(event, day) => setSel({ event, day })}>
      {children}
      {sel && <DetailCard sel={sel} onClose={() => setSel(null)} />}
    </Ctx.Provider>
  );
}

function DetailCard({ sel, onClose }: { sel: Selected; onClose: () => void }) {
  const { event: e, day } = sel;
  const c = colors(e.person);
  const icon = e.person.kid ? kidIcon(e.title) : null;
  const dateText = day.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={e.title}
        onClick={(ev) => ev.stopPropagation()}
        style={{ borderTopColor: c.ink }}
      >
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        <span className="detail-who" style={{ background: c.chip, color: c.ink }}>{e.person.name}</span>
        <h2>
          {icon && <span aria-hidden="true">{icon} </span>}
          {e.title}
        </h2>
        <p className="detail-when">
          {dateText} · {timeLabel(e, day)}
        </p>
        {e.location ? (
          <p className="detail-where">
            <span aria-hidden="true">📍</span>
            <span>{e.location}</span>
          </p>
        ) : (
          <p className="detail-where none">No location added</p>
        )}
      </div>
    </div>
  );
}
