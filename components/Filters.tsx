"use client";

import { forwardRef } from "react";
import type { Competition } from "@/lib/types";
import { CompetitionLogo } from "./CompetitionLogo";

interface Props {
  competitions: Competition[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
}

export const Filters = forwardRef<HTMLInputElement, Props>(function Filters(
  { competitions, selected, onSelect, query, onQuery },
  ref,
) {
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar equipo</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Buscar equipo… (Nacional, Madrid, Vasco)"
          className="w-full rounded-2xl border border-line bg-white/4 py-3 pl-11 pr-10 text-[15px] text-fg placeholder:text-muted focus:border-neon/50 focus:outline-none focus:ring-2 focus:ring-neon/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-fg"
          >
            ✕
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip on={selected === null} onClick={() => onSelect(null)}>
          Todos
        </Chip>
        {competitions.map((c) => (
          <Chip key={c.id} on={selected === c.id} onClick={() => onSelect(selected === c.id ? null : c.id)}>
            <CompetitionLogo competition={c} size={16} />
            {c.shortName}
          </Chip>
        ))}
      </div>
    </div>
  );
});

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`chip inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
        on ? "border-neon/60 bg-neon/15 text-neon" : "border-line bg-white/4 text-fg-2 hover:border-line-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
