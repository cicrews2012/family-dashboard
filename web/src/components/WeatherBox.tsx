import { useEffect, useState } from "react";
import { formatTime } from "../logic.ts";
import { describe, useWeather } from "../weather.ts";
import { WEATHER } from "../config.ts";

export function WeatherBox({ now, demo }: { now: Date; demo: boolean }) {
  const weather = useWeather(demo);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => setOpen(false), 60_000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  if (!weather) return <div />;
  const night = now.getHours() >= 18 || now.getHours() < 6;
  const cur = describe(weather.code, night);
  const evening = now.getHours() >= 18;

  return (
    <>
      <button className="next weather" onClick={() => setOpen(true)} aria-label="Weather: tap for the 7-day forecast">
        <span className="wx-icon" aria-hidden="true">{cur.icon}</span>
        <span className="wx-temp">{weather.temp}°</span>
        {cur.text && <span className="wx-cond">{cur.text}</span>}
        {evening ? (
          <span className="wx-detail">
            · <b>Tomorrow</b> {describe(weather.tomorrow.code).icon} {weather.tomorrow.high}° / {weather.tomorrow.low}°
            {weather.tomorrow.rainChance >= 40 && <> · {weather.tomorrow.rainChance}% rain</>}
          </span>
        ) : (
          <span className="wx-detail">
            · H {weather.high}° · L {weather.low}°
            {weather.rainAt ? (
              <> · <b>Rain around {formatTime(weather.rainAt).replace(":00", "")}</b></>
            ) : weather.rainChance >= 30 ? (
              <> · {weather.rainChance}% chance of rain</>
            ) : null}
          </span>
        )}
      </button>

      {open && (
        <div className="detail-backdrop" onClick={() => setOpen(false)}>
          <div className="detail forecast" role="dialog" aria-modal="true" aria-label="7-day forecast" onClick={(e) => e.stopPropagation()}>
            <button className="detail-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            <h2>7-day forecast</h2>
            <p className="detail-when">{WEATHER.place} · now {weather.temp}° {cur.text.toLowerCase()}</p>
            <ul className="fc">
              {weather.days.map((d, i) => {
                const c = describe(d.code);
                return (
                  <li key={d.date.getTime()}>
                    <span className="fc-day">{i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.date.toLocaleDateString([], { weekday: "long" })}</span>
                    <span className="fc-icon" aria-hidden="true">{c.icon}</span>
                    <span className="fc-cond">{c.text}</span>
                    <span className={`fc-rain${d.rainChance >= 50 ? " wet" : ""}`}>{d.rainChance >= 20 ? `💧 ${d.rainChance}%` : ""}</span>
                    <span className="fc-temps"><b>{d.high}°</b> <span>{d.low}°</span></span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
