"use client";

import { formatShortDay } from "@/lib/time";

export interface DayTab {
  ymd: string;
  label: "Ayer" | "Hoy" | "Mañana";
  count: number;
}

export function DayNav({
  tabs,
  active,
  onChange,
}: {
  tabs: DayTab[];
  active: string;
  onChange: (ymd: string) => void;
}) {
  return (
    <nav aria-label="Día" className="sticky top-0 z-30 -mx-4 bg-ink/80 px-4 pb-2 pt-2 backdrop-blur-xl">
      <div className="relative grid grid-cols-3 rounded-2xl border border-line bg-white/4 p-1">
        {tabs.map((t) => {
          const on = t.ymd === active;
          return (
            <button
              key={t.ymd}
              type="button"
              onClick={() => onChange(t.ymd)}
              aria-current={on ? "date" : undefined}
              className={`chip relative flex flex-col items-center rounded-xl px-2 py-1.5 transition ${
                on ? "bg-neon text-ink shadow-[0_6px_20px_-6px_rgba(77,255,154,0.7)]" : "text-fg-2 hover:text-fg"
              }`}
            >
              <span className="font-display text-[13px] font-bold leading-none">{t.label}</span>
              <span className={`mt-1 text-[10px] uppercase tracking-[0.12em] ${on ? "text-ink/70" : "text-muted"}`}>
                {formatShortDay(t.ymd)} · {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
