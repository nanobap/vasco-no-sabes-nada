"use client";

import type { CompetitionGroup } from "@/lib/agenda";
import { CompetitionLogo } from "./CompetitionLogo";
import { MatchCard } from "./MatchCard";

const REGION: Record<string, string> = {
  uruguay: "Uruguay",
  sudamerica: "Sudamérica",
  europa: "Europa",
  mundo: "Mundo",
};

export function CompetitionSection({ group, now }: { group: CompetitionGroup; now: number | null }) {
  const c = group.competition;
  return (
    <section aria-labelledby={`comp-${c.id}`} className="rise">
      <header className="mb-3 flex items-center gap-3 py-1">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/4"
          style={{ boxShadow: `inset 0 0 0 1px ${c.accent}22` }}
        >
          <CompetitionLogo competition={c} size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={`comp-${c.id}`} className="font-display truncate text-[15px] font-bold leading-tight">
            {c.name}
          </h2>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{REGION[c.region]}</p>
        </div>
        <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-bold tabular-nums text-fg-2">
          {group.matches.length}
        </span>
      </header>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {group.matches.map((m, i) => (
          <MatchCard key={m.id} match={m} now={now} index={i} />
        ))}
      </div>
    </section>
  );
}
