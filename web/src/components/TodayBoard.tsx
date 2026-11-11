import { PEOPLE, UPCOMING_DAYS, type Person } from "../config.ts";
import { colors } from "../theme.ts";
import { addDays, dayHeading, eventsOnDay, kidIcon, timeLabel, type DashEvent, type Meal } from "../logic.ts";
import { MealsStrip, TonightPill } from "./Meals.tsx";
import { useOpenEvent } from "./EventDetails.tsx";

export type BoardMode = "today" | "upcoming";

interface Props {
  events: DashEvent[];
  today: Date;
  mode: BoardMode;
  onMode: (m: BoardMode) => void;
  meals?: Meal[] | null;
}

function EventItem({ e, day, person }: { e: DashEvent; day: Date; person: Person }) {
  const icon = person.kid ? kidIcon(e.title) : null;
  const open = useOpenEvent();
  return (
    <li>
      <button className="ev-btn" onClick={() => open(e, day)}>
      <span className="t">{timeLabel(e, day)}</span>
      <span className="what">
        {icon && <span className="icon" aria-hidden="true">{icon}</span>}
        {e.title}
      </span>
      {e.location && <span className="where">📍 {e.location}</span>}
      </button>
    </li>
  );
}

export function TodayBoard({ events, today, mode, onMode, meals }: Props) {
  const days = mode === "today" ? [today] : Array.from({ length: UPCOMING_DAYS }, (_, i) => addDays(today, i));
  const byDay = days.map((d) => ({ day: d, list: eventsOnDay(events, d) }));

  return (
    <main className="board">
      <div className="board-tabs">
        <button className={mode === "today" ? "on" : ""} onClick={() => onMode("today")}>Today</button>
        <button className={mode === "upcoming" ? "on" : ""} onClick={() => onMode("upcoming")}>
          Next {UPCOMING_DAYS} days
        </button>
        <TonightPill meals={meals} today={today} />
      </div>
      <div className="notes">
        {PEOPLE.map((p, i) => {
          const groups = byDay
            .map(({ day, list }) => ({ day, mine: list.filter((e) => e.person.key === p.key) }))
            .filter((g) => g.mine.length > 0);
          return (
            <section
              key={p.key}
              className="note"
              style={{ background: colors(p).note, color: colors(p).ink, transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
            >
              <h2>{p.name}</h2>
              {groups.length === 0 ? (
                <p className="empty">{mode === "today" ? "Free today" : `Nothing in the next ${UPCOMING_DAYS} days`}</p>
              ) : mode === "today" ? (
                <ul>
                  {groups[0].mine.map((e) => (
                    <EventItem key={e.id} e={e} day={today} person={p} />
                  ))}
                </ul>
              ) : (
                groups.map(({ day, mine }) => (
                  <div key={day.getTime()} className="note-day">
                    <h3>{dayHeading(day, today)}</h3>
                    <ul>
                      {mine.map((e) => (
                        <EventItem key={`${e.id}-${day.getTime()}`} e={e} day={day} person={p} />
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
      <MealsStrip meals={meals} today={today} />
    </main>
  );
}
