import { KID_ICONS, PEOPLE, UNLABELED_PERSON, type Person } from "./config.ts";

export interface Label {
  id: string;
  name: string;
  color: string | null;
}

export interface ApiEvent {
  id: string;
  title: string;
  start: string; // RFC3339, or YYYY-MM-DD when allDay
  end: string;
  allDay: boolean;
  location: string | null;
  labelId: string | null;
}

export interface ApiResponse {
  labels: Label[];
  events: ApiEvent[];
  fetchedAt: string;
  apiVersion?: string;
}

export interface DashEvent extends ApiEvent {
  person: Person;
  startDate: Date;
  endDate: Date; // exclusive
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** All-day dates are calendar dates in local time, not UTC midnight. */
export function parseEventTime(value: string, allDay: boolean): Date {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function personByKey(key: string): Person {
  return PEOPLE.find((p) => p.key === key) ?? PEOPLE[PEOPLE.length - 1];
}

export function resolvePerson(labelId: string | null, labels: Label[]): Person {
  const name = labels.find((l) => l.id === labelId)?.name.trim().toLowerCase();
  const match = name ? PEOPLE.find((p) => p.labels.includes(name) || p.key === name) : undefined;
  return match ?? personByKey(UNLABELED_PERSON);
}

export function prepare(data: ApiResponse): DashEvent[] {
  return data.events
    .map((e) => {
      const startDate = parseEventTime(e.start, e.allDay);
      let endDate = parseEventTime(e.end, e.allDay);
      if (endDate <= startDate) endDate = e.allDay ? addDays(startDate, 1) : new Date(startDate.getTime() + 1);
      return { ...e, person: resolvePerson(e.labelId, data.labels), startDate, endDate };
    })
    .sort(compareEvents);
}

function compareEvents(a: DashEvent, b: DashEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.startDate.getTime() - b.startDate.getTime() || a.title.localeCompare(b.title);
}

/** Events that overlap the given local day. */
export function eventsOnDay(events: DashEvent[], day: Date): DashEvent[] {
  const s = startOfDay(day);
  const e = addDays(s, 1);
  return events.filter((ev) => ev.startDate < e && ev.endDate > s);
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP]M)$/i, (_, ap: string) => ap.toLowerCase());
}

/** "9:00 – 10:30am", "11:30am – 1:00pm", "All day", or "until 11:00am" for events continuing from an earlier day. */
export function timeLabel(ev: DashEvent, day: Date): string {
  if (ev.allDay) return "All day";
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const startsEarlier = ev.startDate < dayStart;
  const endsLater = ev.endDate > dayEnd;
  if (startsEarlier && endsLater) return "All day";
  if (startsEarlier) return `until ${formatTime(ev.endDate)}`;
  return timeRange(ev.startDate, ev.endDate);
}

export function timeRange(start: Date, end: Date): string {
  const s = formatTime(start);
  if (end.getTime() - start.getTime() < 60_000) return s;
  const e = formatTime(end);
  return s.slice(-2) === e.slice(-2) ? `${s.slice(0, -2)} – ${e}` : `${s} – ${e}`;
}

/** "Today", "Tomorrow", or "Fri, Nov 13". */
export function dayHeading(day: Date, today: Date): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(today).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return day.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** Next timed event starting in the next 24 hours. */
export function upNext(events: DashEvent[], now: Date): DashEvent | null {
  const limit = now.getTime() + 24 * 3600 * 1000;
  return events.find((e) => !e.allDay && e.startDate > now && e.startDate.getTime() <= limit) ?? null;
}

export function countdown(target: Date, now: Date): string {
  const mins = Math.round((target.getTime() - now.getTime()) / 60000);
  if (mins <= 1) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `in ${h} hr ${m} min` : `in ${h} hr`;
}

export function kidIcon(title: string): string | null {
  for (const [re, icon] of KID_ICONS) if (re.test(title)) return icon;
  return null;
}

export function isNight(now: Date, start: number, end: number): boolean {
  if (start === end) return false;
  const h = now.getHours();
  return start > end ? h >= start || h < end : h >= start && h < end;
}

/** Sunday-first weeks covering the whole month (4–6 rows). */
export function monthGrid(monthStart: Date): Date[] {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay());
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const gridEnd = addDays(last, 7 - last.getDay()); // exclusive, end of last week
  const days: Date[] = [];
  for (let d = gridStart; d < gridEnd; d = addDays(d, 1)) days.push(d);
  return days;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
