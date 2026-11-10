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

/** "9:00am", "All day", or "until 11am" for events that started on an earlier day. */
export function timeLabel(ev: DashEvent, day: Date): string {
  if (ev.allDay) return "All day";
  if (ev.startDate < startOfDay(day)) return `until ${formatTime(ev.endDate)}`;
  return formatTime(ev.startDate);
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
