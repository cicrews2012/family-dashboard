import { PEOPLE } from "../config.ts";
import { colors } from "../theme.ts";
import { eventsOnDay, kidIcon, timeLabel, type DashEvent } from "../logic.ts";

interface Props {
  events: DashEvent[];
  day: Date;
  offset: number;
  onOffset: (n: number) => void;
}

export function TodayBoard({ events, day, offset, onOffset }: Props) {
  const todays = eventsOnDay(events, day);
  return (
    <main className="board">
      <div className="board-tabs">
        <button className={offset === 0 ? "on" : ""} onClick={() => onOffset(0)}>Today</button>
        <button className={offset === 1 ? "on" : ""} onClick={() => onOffset(1)}>Tomorrow</button>
      </div>
      <div className="notes">
        {PEOPLE.map((p, i) => {
          const mine = todays.filter((e) => e.person.key === p.key);
          return (
            <section
              key={p.key}
              className="note"
              style={{ background: colors(p).note, color: colors(p).ink, transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
            >
              <h2>{p.name}</h2>
              {mine.length === 0 ? (
                <p className="empty">Free {offset === 0 ? "today" : "tomorrow"}</p>
              ) : (
                <ul>
                  {mine.map((e) => {
                    const icon = p.kid ? kidIcon(e.title) : null;
                    return (
                      <li key={e.id}>
                        <span className="t">{timeLabel(e, day)}</span>
                        <span className="what">
                          {icon && <span className="icon" aria-hidden="true">{icon}</span>}
                          {e.title}
                        </span>
                        {e.location && <span className="where">{e.location}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
