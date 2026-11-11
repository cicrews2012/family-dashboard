import { useState } from "react";
import { colors } from "../theme.ts";
import { eventsOnDay, kidIcon, monthGrid, sameDay, timeLabel, type DashEvent } from "../logic.ts";

interface Props {
  events: DashEvent[] | null;
  month: Date; // first of the month shown
  today: Date;
  offset: number;
  onOffset: (n: number) => void;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

export function MonthView({ events, month, today, offset, onOffset }: Props) {
  const [picked, setPicked] = useState<Date | null>(null);
  const days = monthGrid(month);
  const selected = picked && picked.getMonth() === month.getMonth() ? picked : null;
  const list = selected && events ? eventsOnDay(events, selected) : [];

  return (
    <main className="month">
      <div className="month-bar">
        <button onClick={() => onOffset(offset - 1)} aria-label="Previous month">‹</button>
        <h2>{month.toLocaleDateString([], { month: "long", year: "numeric" })}</h2>
        <button onClick={() => onOffset(offset + 1)} aria-label="Next month">›</button>
        {offset !== 0 && (
          <button className="month-today" onClick={() => onOffset(0)}>
            This month
          </button>
        )}
      </div>

      <div className="month-grid">
        {DOW.map((d) => (
          <div key={d} className="month-dow">{d}</div>
        ))}
        {days.map((d) => {
          const inMonth = d.getMonth() === month.getMonth();
          const dayEvents = events ? eventsOnDay(events, d) : [];
          const extra = dayEvents.length - MAX_CHIPS;
          const isToday = sameDay(d, today);
          const isSel = selected && sameDay(d, selected);
          return (
            <button
              key={d.getTime()}
              className={`mcell${inMonth ? "" : " out"}${isToday ? " today" : ""}${isSel ? " sel" : ""}`}
              onClick={() => setPicked(isSel ? null : d)}
              aria-label={`${d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}, ${dayEvents.length} events`}
            >
              <span className="mnum">{d.getDate()}</span>
              <span className="mchips">
                {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                  <span
                    key={e.id}
                    className="mchip"
                    style={{ background: colors(e.person).chip, color: colors(e.person).ink }}
                  >
                    {e.title}
                  </span>
                ))}
                {extra > 0 && <span className="mmore">+{extra} more</span>}
              </span>
              <span className="mdots" aria-hidden="true">
                {dayEvents.slice(0, 4).map((e) => (
                  <span key={e.id} style={{ background: colors(e.person).ink }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {!events && <p className="loading">Loading the month…</p>}

      {selected && (
        <section className="mday">
          <h3>{selected.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</h3>
          {list.length === 0 && <p className="empty">Nothing planned</p>}
          {list.map((e) => {
            const icon = e.person.kid ? kidIcon(e.title) : null;
            return (
              <div key={e.id} className="chip" style={{ background: colors(e.person).chip, color: colors(e.person).ink }}>
                <span className="t">{timeLabel(e, selected)}</span>
                <span className="what">
                  {icon && <span aria-hidden="true">{icon} </span>}
                  {e.title}
                </span>
                <span className="who">{e.person.name}</span>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
