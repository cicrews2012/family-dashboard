import { test } from "node:test";
import assert from "node:assert/strict";
import { eventsOnDay, isNight, prepare, resolvePerson, startOfDay, addDays, timeLabel, upNext, countdown } from "../src/logic.ts";
import { demoData } from "../src/demo.ts";

const labels = [
  { id: "a", name: "Christian", color: null },
  { id: "b", name: " savannah ", color: null },
  { id: "c", name: "Something else", color: null },
];

test("labels map to people by name, case-insensitive", () => {
  assert.equal(resolvePerson("a", labels).key, "christian");
  assert.equal(resolvePerson("b", labels).key, "savannah");
});

test("unknown or missing labels fall back to Family", () => {
  assert.equal(resolvePerson("c", labels).key, "family");
  assert.equal(resolvePerson(null, labels).key, "family");
  assert.equal(resolvePerson("zzz", labels).key, "family");
});

test("all-day events land on their local calendar date only", () => {
  const evs = prepare({ labels, fetchedAt: "", events: [
    { id: "x", title: "Picture day", start: "2026-11-13", end: "2026-11-14", allDay: true, location: null, labelId: null },
  ]});
  assert.equal(eventsOnDay(evs, new Date(2026, 10, 13)).length, 1);
  assert.equal(eventsOnDay(evs, new Date(2026, 10, 12)).length, 0);
  assert.equal(eventsOnDay(evs, new Date(2026, 10, 14)).length, 0);
});

test("overnight event shows on both days with 'until' on day two", () => {
  const s = new Date(2026, 10, 10, 22, 0), e = new Date(2026, 10, 11, 2, 0);
  const evs = prepare({ labels, fetchedAt: "", events: [
    { id: "o", title: "Flight", start: s.toISOString(), end: e.toISOString(), allDay: false, location: null, labelId: "a" },
  ]});
  const d2 = new Date(2026, 10, 11);
  assert.equal(eventsOnDay(evs, new Date(2026, 10, 10)).length, 1);
  assert.equal(eventsOnDay(evs, d2).length, 1);
  assert.match(timeLabel(evs[0], d2), /^until /);
});

test("all-day sorts before timed", () => {
  const evs = prepare(demoData(new Date(2026, 10, 10, 7, 0)));
  const wed = eventsOnDay(evs, new Date(2026, 10, 12));
  assert.equal(wed[0].allDay, true);
});

test("up next and countdown", () => {
  const now = new Date(2026, 10, 10, 15, 45);
  const evs = prepare(demoData(now));
  const next = upNext(evs, now);
  assert.equal(next?.title, "Swim lesson");
  assert.equal(countdown(next!.startDate, now), "in 45 min");
  assert.equal(countdown(new Date(now.getTime() + 90 * 60000), now), "in 1 hr 30 min");
});

test("night window wraps midnight", () => {
  assert.equal(isNight(new Date(2026, 0, 1, 22), 21, 6), true);
  assert.equal(isNight(new Date(2026, 0, 1, 3), 21, 6), true);
  assert.equal(isNight(new Date(2026, 0, 1, 12), 21, 6), false);
  assert.equal(isNight(new Date(2026, 0, 1, 12), 6, 6), false);
});

test("week range helper", () => {
  const t = startOfDay(new Date(2026, 10, 10, 13));
  assert.equal(addDays(t, 7).getDate(), 17);
});

import { monthGrid } from "../src/logic.ts";
test("month grid covers whole weeks, Sunday first", () => {
  const nov = monthGrid(new Date(2026, 10, 1)); // Nov 2026 starts on Sunday
  assert.equal(nov[0].getDate(), 1);
  assert.equal(nov.length % 7, 0);
  assert.equal(nov[0].getDay(), 0);
  const last = nov[nov.length - 1];
  assert.equal(last.getDay(), 6);
  const feb = monthGrid(new Date(2026, 1, 1));
  assert.ok(feb.length >= 28 && feb.length <= 42);
});

import { timeRange, dayHeading } from "../src/logic.ts";
test("time ranges share am/pm when they can", () => {
  assert.equal(timeRange(new Date(2026, 10, 10, 9, 0), new Date(2026, 10, 10, 10, 30)), "9:00 – 10:30am");
  assert.equal(timeRange(new Date(2026, 10, 10, 11, 30), new Date(2026, 10, 10, 13, 0)), "11:30am – 1:00pm");
  assert.equal(timeRange(new Date(2026, 10, 10, 9, 0), new Date(2026, 10, 10, 9, 0)), "9:00am");
});
test("overnight event starting today shows its range", () => {
  const s = new Date(2026, 10, 10, 22, 0), e = new Date(2026, 10, 11, 2, 0);
  const evs = prepare({ labels, fetchedAt: "", events: [
    { id: "o", title: "Flight", start: s.toISOString(), end: e.toISOString(), allDay: false, location: null, labelId: "a" },
  ]});
  assert.equal(timeLabel(evs[0], new Date(2026, 10, 10)), "10:00pm – 2:00am");
});
test("day headings", () => {
  const t = new Date(2026, 10, 11);
  assert.equal(dayHeading(t, t), "Today");
  assert.equal(dayHeading(new Date(2026, 10, 12), t), "Tomorrow");
  assert.match(dayHeading(new Date(2026, 10, 13), t), /Fri/);
});

import { mealsOn } from "../src/logic.ts";
test("meals map to dates by weekday", () => {
  const meals = [{ day: 3, meal: "Tacos", notes: null }, { day: null, meal: "Leftovers", notes: null }];
  assert.deepEqual(mealsOn(meals, new Date(2026, 10, 11)).map((m) => m.meal), ["Tacos"]); // Wed
  assert.deepEqual(mealsOn(meals, new Date(2026, 10, 12)), []);
  assert.deepEqual(mealsOn(null, new Date(2026, 10, 11)), []);
});
