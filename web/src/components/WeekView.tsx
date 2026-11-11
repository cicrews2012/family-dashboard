import { WEEK_DAYS } from "../config.ts";
import { colors } from "../theme.ts";
import { addDays, eventsOnDay, kidIcon, timeLabel, type DashEvent } from "../logic.ts";

interface Props {
  events: DashEvent[];
  today: Date;
  now: Date;
}

export function WeekView({ events, today, now }: Props) {
  const days = Array.from({ length: WEEK_DAYS }, (_, i) => addDays(today, i));
  return (
    <main className="week">
      {days.map((d, i) => {
        const list = eventsOnDay(events, d);
        return (
          <section key={d.getTime()} className={`day${i === 0 ? " is-today" : ""}`}>
            <h3>
              <span className="dow">{i === 0 ? "Today" : d.toLocaleDateString([], { weekday: "short" })}</span>
              <span className="dnum">{d.getDate()}</span>
            </h3>
            {list.length === 0 && <p className="empty">—</p>}
            {list.map((e) => {
              const past = !e.allDay && e.endDate < now;
              const icon = e.person.kid ? kidIcon(e.title) : null;
              return (
                <div
                  key={`${e.id}-${d.getTime()}`}
                  className={`chip${past ? " past" : ""}`}
                  style={{ background: colors(e.person).chip, color: colors(e.person).ink }}
                  title={`${e.person.name}: ${e.title}`}
                >
                  <span className="t">{timeLabel(e, d)}</span>
                  <span className="what">
                    {icon && <span aria-hidden="true">{icon} </span>}
                    {e.title}
                  </span>
                  <span className="who">{e.person.name}</span>
                </div>
              );
            })}
          </section>
        );
      })}
    </main>
  );
}
