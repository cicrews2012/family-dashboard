import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEvent, normalizeLabels, safeEqual } from "../src/index.ts";

test("timed event keeps its label", () => {
  const e = normalizeEvent({
    id: "a", summary: " Swim lesson ", eventLabelId: "L3",
    start: { dateTime: "2026-11-10T16:30:00-05:00" }, end: { dateTime: "2026-11-10T17:15:00-05:00" },
  });
  assert.deepEqual(e, {
    id: "a", title: "Swim lesson", start: "2026-11-10T16:30:00-05:00", end: "2026-11-10T17:15:00-05:00",
    allDay: false, location: null, labelId: "L3",
  });
});

test("all-day, untitled, unlabeled event", () => {
  const e = normalizeEvent({ id: "b", start: { date: "2026-11-13" }, end: { date: "2026-11-14" } });
  assert.equal(e?.allDay, true);
  assert.equal(e?.title, "(No title)");
  assert.equal(e?.labelId, null);
});

test("cancelled events are dropped", () => {
  assert.equal(normalizeEvent({ id: "c", status: "cancelled", start: { date: "2026-11-13" } }), null);
});

test("labels are read from labelProperties", () => {
  const labels = normalizeLabels({
    labelProperties: { eventLabels: [{ id: "1", name: " Christian ", backgroundColor: "#0b8043" }, { name: "no id" }] },
  });
  assert.deepEqual(labels, [{ id: "1", name: "Christian", color: "#0b8043" }]);
  assert.deepEqual(normalizeLabels({}), []);
});

test("safeEqual", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", ""), true);
});
