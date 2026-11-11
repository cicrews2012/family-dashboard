import { addDays, startOfDay, type ApiResponse, type ApiEvent } from "./logic.ts";

/** Sample week so the dashboard can be tried before Google is connected (?demo). */
export function demoData(now = new Date()): ApiResponse {
  const today = startOfDay(now);
  const labels = [
    { id: "L1", name: "Christian", color: "#0b8043" },
    { id: "L2", name: "Savannah", color: "#e67c73" },
    { id: "L3", name: "Emerson", color: "#8e24aa" },
    { id: "L4", name: "Twins", color: "#f6bf26" },
    { id: "L5", name: "Family", color: "#d50000" },
  ];
  let n = 0;
  const at = (day: number, h: number, m: number, mins: number, title: string, labelId: string | null): ApiEvent => {
    const s = addDays(today, day);
    s.setHours(h, m);
    return {
      id: `demo${n++}`, title, start: s.toISOString(), end: new Date(s.getTime() + mins * 60000).toISOString(),
      allDay: false, location: null, labelId,
    };
  };
  const allDay = (day: number, title: string, labelId: string | null): ApiEvent => {
    const d = addDays(today, day);
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    return { id: `demo${n++}`, title, start: iso(d), end: iso(addDays(d, 1)), allDay: true, location: null, labelId };
  };
  const events: ApiEvent[] = [];
  for (let d = 0; d < 7; d++) {
    const dow = addDays(today, d).getDay();
    if (dow >= 1 && dow <= 5) {
      events.push(at(d, 8, 0, 240, "Preschool", "L3"));
      events.push(at(d, 9, 0, 30, "Client standup", "L1"));
    }
  }
  events.push(
    at(0, 10, 30, 60, "Dentist", "L2"),
    at(0, 11, 0, 45, "18-month checkup", "L4"),
    at(0, 16, 30, 45, "Swim lesson", "L3"),
    at(0, 18, 0, 90, "Book club", "L2"),
    at(0, 17, 30, 60, "Dinner at Nana's", "L5"),
    at(1, 14, 0, 60, "Intune rollout", "L1"),
    at(1, 9, 30, 60, "Library story time", "L4"),
    allDay(2, "Picture day", "L3"),
    at(3, 19, 0, 120, "Girls' night", "L2"),
    at(4, 18, 0, 120, "Family BBQ", "L5"),
    at(5, 10, 0, 120, "Birthday party", "L3"),
    allDay(6, "Trash day", null),
  );
  const where: Record<string, string> = {
    "Swim lesson": "Augusta Aquatics Center, 3155 Damascus Rd, Augusta, GA",
    "Birthday party": "Pump It Up, 4230 Washington Rd, Evans, GA",
    Dentist: "Smile Dental, 123 Example St",
  };
  for (const e of events) if (where[e.title]) e.location = where[e.title];
  const meals = [
    { day: 0, meal: "Pot roast", notes: null },
    { day: 1, meal: "Tacos", notes: null },
    { day: 2, meal: "Chicken alfredo", notes: "Kids get plain pasta" },
    { day: 3, meal: "Breakfast for dinner", notes: null },
    { day: 4, meal: "Burgers", notes: null },
    { day: 5, meal: "Pizza night", notes: null },
    { day: null, meal: "Leftovers", notes: null },
  ];
  return { labels, events, meals, mealsStatus: "ok", fetchedAt: now.toISOString() };
}
