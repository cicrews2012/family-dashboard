import { addDays, mealsOn, type Meal } from "../logic.ts";

/** "🍽️ Tonight: Tacos" pill for the top of the board. */
export function TonightPill({ meals, today }: { meals: Meal[] | null | undefined; today: Date }) {
  const tonight = mealsOn(meals, today);
  if (!meals || tonight.length === 0) return null;
  return (
    <div className="tonight" title={tonight.map((m) => m.notes).filter(Boolean).join(" · ") || undefined}>
      <span aria-hidden="true">🍽️</span>
      <span className="tonight-label">Tonight</span>
      <span className="tonight-meal">{tonight.map((m) => m.meal).join(" + ")}</span>
    </div>
  );
}

/** The next 7 nights' dinners, starting tonight, plus any unassigned meals. */
export function MealsStrip({ meals, today }: { meals: Meal[] | null | undefined; today: Date }) {
  if (!meals || meals.length === 0) return null;
  const nights = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const anyNight = meals.filter((m) => m.day === null);
  return (
    <section className="meals" aria-label="Dinners this week">
      <h2>Dinners this week</h2>
      <div className="meal-row">
        {nights.map((d, i) => {
          const list = mealsOn(meals, d);
          return (
            <div key={d.getTime()} className={`meal${i === 0 ? " is-tonight" : ""}${list.length ? "" : " empty"}`}>
              <span className="meal-day">{i === 0 ? "Tonight" : d.toLocaleDateString([], { weekday: "short" })}</span>
              <span className="meal-name">{list.length ? list.map((m) => m.meal).join(" + ") : "—"}</span>
              {list.some((m) => m.notes) && (
                <span className="meal-notes">{list.map((m) => m.notes).filter(Boolean).join(" · ")}</span>
              )}
            </div>
          );
        })}
        {anyNight.length > 0 && (
          <div className="meal any">
            <span className="meal-day">Any night</span>
            <span className="meal-name">{anyNight.map((m) => m.meal).join(", ")}</span>
          </div>
        )}
      </div>
    </section>
  );
}
