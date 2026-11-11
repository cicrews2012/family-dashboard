// Everything you'd want to tweak lives here.

export interface Person {
  key: string;
  name: string;
  /** Label names (lowercase) in Google Calendar that belong to this person. */
  labels: string[];
  /** Note background, chip background, and text color. */
  note: string;
  chip: string;
  ink: string;
  /** Colors used in dark mode. */
  dark: { note: string; chip: string; ink: string };
  /** Kids get picture icons on their events. */
  kid?: boolean;
}

export const PEOPLE: Person[] = [
  { key: "christian", name: "Christian", labels: ["christian", "dad"], note: "#dff0d2", chip: "#c4e3ad", ink: "#1f4d14", dark: { note: "#1f3319", chip: "#2c4a22", ink: "#cfe9bd" } },
  { key: "savannah", name: "Savannah", labels: ["savannah", "mom"], note: "#fde0ea", chip: "#f8c1d4", ink: "#7a1740", dark: { note: "#3a1a27", chip: "#552438", ink: "#f9cfe0" } },
  { key: "emerson", name: "Emerson", labels: ["emerson"], note: "#ebe1fb", chip: "#d6c4f5", ink: "#43277a", dark: { note: "#2a2140", chip: "#3b2e5c", ink: "#ddd0f8" }, kid: true },
  { key: "twins", name: "Twins", labels: ["twins", "twin"], note: "#fff1b8", chip: "#fde38a", ink: "#5f4600", dark: { note: "#3a3010", chip: "#54451a", ink: "#fbe7a0" }, kid: true },
  { key: "family", name: "Family", labels: ["family", "whole family", "everyone"], note: "#fde1dd", chip: "#f7bdb5", ink: "#7f1d17", dark: { note: "#3d1b17", chip: "#58261f", ink: "#f8cdc6" } },
];

/** Events with no label (or a label not listed above) go here. */
export const UNLABELED_PERSON = "family";

/** How often to refresh while the screen is on. */
export const REFRESH_MS = 60 * 1000;

/** Days shown on the name cards in "Next days" mode, starting today. */
export const UPCOMING_DAYS = 7;

/** Days shown in the week view, starting today. */
export const WEEK_DAYS = 7;

/** Dim the screen between these hours (24h clock). Set NIGHT_START = NIGHT_END to turn off. */
export const NIGHT_START = 21;
export const NIGHT_END = 6;

/** Worker URL, baked in at build time (GitHub repo variable VITE_API_BASE). */
export const API_BASE = (import.meta.env?.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Picture icons for kids' events, matched against the event title. */
export const KID_ICONS: Array<[RegExp, string]> = [
  [/swim|pool/i, "🏊"],
  [/school|preschool|class|daycare/i, "🎒"],
  [/doctor|checkup|check-up|pediatric|dentist|appt|appointment/i, "🩺"],
  [/birthday|party/i, "🎂"],
  [/soccer|ball|practice|game/i, "⚽"],
  [/dance|ballet/i, "🩰"],
  [/library|story/i, "📚"],
  [/park|playground|zoo/i, "🛝"],
  [/church/i, "⛪"],
  [/haircut/i, "✂️"],
  [/grandma|grandpa|nana|papa|mimi/i, "👵"],
];

/** Where the weather in the header is for. */
export const WEATHER = { latitude: 33.47, longitude: -82.01, unit: "fahrenheit" as "fahrenheit" | "celsius", place: "Augusta" };
