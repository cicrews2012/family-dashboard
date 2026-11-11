import { useEffect, useState } from "react";
import { PEOPLE, type Person } from "./config.ts";

export type ThemeSetting = "auto" | "light" | "dark";
const KEY = "fd.theme";
const ORDER: ThemeSetting[] = ["auto", "light", "dark"];

/** Each person's colors as CSS variables, so light/dark switch without re-rendering. */
export function installPersonColors() {
  const light = PEOPLE.map((p) => `--p-${p.key}-note:${p.note};--p-${p.key}-chip:${p.chip};--p-${p.key}-ink:${p.ink};`).join("");
  const dark = PEOPLE.map(
    (p) => `--p-${p.key}-note:${p.dark.note};--p-${p.key}-chip:${p.dark.chip};--p-${p.key}-ink:${p.dark.ink};`,
  ).join("");
  const el = document.createElement("style");
  el.textContent = `:root{${light}}:root[data-theme="dark"]{${dark}}`;
  document.head.appendChild(el);
}

export function colors(p: Person) {
  return {
    note: `var(--p-${p.key}-note)`,
    chip: `var(--p-${p.key}-chip)`,
    ink: `var(--p-${p.key}-ink)`,
  };
}

function load(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {
    /* storage blocked */
  }
  return "auto";
}

/** Auto follows the device's Light/Dark setting (including its automatic schedule). */
export function useTheme(): [ThemeSetting, () => void] {
  const [setting, setSetting] = useState<ThemeSetting>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, setting);
    } catch {
      /* storage blocked */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = setting === "dark" || (setting === "auto" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#17140f" : "#f6f1e7");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [setting]);

  const cycle = () => setSetting((s) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length]);
  return [setting, cycle];
}
