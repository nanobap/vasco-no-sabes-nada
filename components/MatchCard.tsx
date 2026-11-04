"use client";

import type { MatchView } from "@/lib/types";
import { displayStatus } from "@/lib/status";
import { hasScore } from "@/lib/agenda";
import Link from "next/link";
import { Crest } from "./Crest";
import { StatusChip } from "./StatusChip";

interface Props {
  match: MatchView;
  now: number | null;
  index?: number;
}

export function MatchCard({ match: m, now, index = 0 }: Props) {
  const st = displayStatus(m, now);
  const finished = hasScore(m);
  const homeWins = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0);
  const awayWins = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0);

  return (
    <Link
      href={`/partido/${m.id}/`}
      className="card card-hover rise relative block overflow-hidden rounded-2xl px-3 pb-3 pt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 sm:px-4"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      aria-label={`${m.home.name} contra ${m.away.name}, ${m.localTime}. Ver partido`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${m.competition.accent}, transparent)` }}
      />
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
        <TeamSide team={m.home} dim={finished && !homeWins && !!awayWins} />

        <div className="flex min-w-[84px] flex-col items-center justify-center gap-1.5 pt-2">
          {finished ? (
            <div className="font-display flex items-baseline gap-1.5 text-[26px] font-bold leading-none tabular-nums">
              <span className={homeWins ? "text-fg" : "text-fg-2"}>{m.homeScore}</span>
              <span className="text-base text-muted">–</span>
              <span className={awayWins ? "text-fg" : "text-fg-2"}>{m.awayScore}</span>
            </div>
          ) : (
            <>
              <span className="font-display text-[9px] font-bold uppercase tracking-[0.3em] text-muted">vs</span>
              <div className="font-display text-glow text-[24px] font-bold leading-none tabular-nums text-neon">
                {m.localTime}
              </div>
            </>
          )}
          {st.kind !== "scheduled" && <StatusChip status={st} />}
        </div>

        <TeamSide team={m.away} dim={finished && !awayWins && !!homeWins} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11px] text-muted">
        <span className="truncate">{m.round}</span>
        {m.venue && <span className="truncate text-right">{m.venue}</span>}
      </div>
      {(st.kind === "in-progress" || st.kind === "ended-pending") && (
        <p className="mt-1 text-[11px] text-amber/80">
          {st.kind === "in-progress" ? "Según el horario ya empezó" : "Según el horario ya terminó"} · {st.note}
        </p>
      )}
    </Link>
  );
}

function TeamSide({ team, dim }: { team: MatchView["home"]; dim: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-2 text-center ${dim ? "opacity-55" : ""}`}>
      <Crest team={team} size={52} className="shrink-0" />
      <div className="min-w-0 px-0.5">
        <div className="line-clamp-2 text-[13px] font-bold leading-tight">{team.name}</div>
      </div>
    </div>
  );
}
