import { useEffect, useState } from "react";
import { WEATHER } from "./config.ts";

export interface Weather {
  temp: number;
  code: number;
  high: number;
  low: number;
  /** First hour today (from now) with a good chance of rain, if any. */
  rainAt: Date | null;
  rainChance: number; // today's max %
  tomorrow: DayForecast;
  /** Today plus the next 6 days. */
  days: DayForecast[];
}

export interface DayForecast {
  date: Date;
  high: number;
  low: number;
  code: number;
  rainChance: number;
}

/** WMO weather codes -> emoji + short words. */
export function describe(code: number, night = false): { icon: string; text: string } {
  if (code === 0) return { icon: night ? "🌙" : "☀️", text: "Clear" };
  if (code === 1 || code === 2) return { icon: night ? "☁️" : "⛅", text: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", text: "Cloudy" };
  if (code === 45 || code === 48) return { icon: "🌫️", text: "Fog" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", text: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "🌧️", text: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "🌨️", text: "Snow" };
  if (code >= 95) return { icon: "⛈️", text: "Storms" };
  return { icon: "🌡️", text: "" };
}

interface OpenMeteo {
  current: { temperature_2m: number; weather_code: number };
  hourly: { time: string[]; precipitation_probability: number[] };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
  };
}

export function parse(data: OpenMeteo, now: Date): Weather {
  let rainAt: Date | null = null;
  const todayKey = now.toDateString();
  for (let i = 0; i < data.hourly.time.length; i++) {
    const t = new Date(data.hourly.time[i]);
    if (t.toDateString() !== todayKey || t.getTime() < now.getTime() - 3600_000) continue;
    if ((data.hourly.precipitation_probability[i] ?? 0) >= 50) {
      rainAt = t;
      break;
    }
  }
  const d = data.daily;
  const days: DayForecast[] = d.time.map((t, i) => {
    const [y, m, day] = t.split("-").map(Number);
    return {
      date: new Date(y, m - 1, day),
      high: Math.round(d.temperature_2m_max[i]),
      low: Math.round(d.temperature_2m_min[i]),
      code: d.weather_code[i],
      rainChance: d.precipitation_probability_max[i] ?? 0,
    };
  });
  return {
    temp: Math.round(data.current.temperature_2m),
    code: data.current.weather_code,
    high: Math.round(d.temperature_2m_max[0]),
    low: Math.round(d.temperature_2m_min[0]),
    rainAt,
    rainChance: d.precipitation_probability_max[0] ?? 0,
    tomorrow: days[1],
    days,
  };
}

function demoWeather(now: Date): Weather {
  const rain = new Date(now);
  rain.setHours(17, 0, 0, 0);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sample: Array<[number, number, number, number]> = [
    [71, 48, 61, 60], [69, 45, 0, 10], [66, 44, 2, 0], [62, 41, 3, 20], [58, 39, 63, 80], [61, 40, 2, 30], [67, 46, 0, 0],
  ];
  const days = sample.map(([high, low, code, rainChance], i) => ({
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), high, low, code, rainChance,
  }));
  return { temp: 64, code: 2, high: 71, low: 48, rainAt: rain > now ? rain : null, rainChance: 60, tomorrow: days[1], days };
}

const REFRESH = 15 * 60 * 1000;

export function useWeather(demo: boolean): Weather | null {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    if (demo) {
      setW(demoWeather(new Date()));
      return;
    }
    let last = 0;
    const load = async () => {
      if (Date.now() - last < 60_000) return;
      last = Date.now();
      const params = new URLSearchParams({
        latitude: String(WEATHER.latitude),
        longitude: String(WEATHER.longitude),
        current: "temperature_2m,weather_code",
        hourly: "precipitation_probability",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
        temperature_unit: WEATHER.unit,
        timezone: "auto",
        forecast_days: "7",
      });
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (res.ok) setW(parse((await res.json()) as OpenMeteo, new Date()));
      } catch {
        /* keep the last reading */
      }
    };
    load();
    const id = setInterval(load, REFRESH);
    const wake = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [demo]);
  return w;
}
