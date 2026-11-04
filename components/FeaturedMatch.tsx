"use client";

import type { MatchView } from "@/lib/types";
import { displayStatus } from "@/lib/status";
import { hasScore } from "@/lib/agenda";
import Link from "next/link";
import { Crest } from "./Crest";
import { CompetitionLogo } from "./CompetitionLogo";
import { StatusChip } from "./StatusChip";

export function FeaturedMatch({ match: m, now }: { match: MatchView; now: number | null }) {
  const st = displayStatus(m, now);
  const finished = hasScore(m);

  return (
    <section
      aria-label="Partido destacado"
      className="rise relative overflow-hidden rounded-[28px] border border-neon/25 p-[1px]"
      style={{
        background:
          "linear-gradient(135deg, rgba(77,255,154,0.55), rgba(77,255,154,0.05) 35%, rgba(125,211,252,0.15) 70%, rgba(77,255,154,0.4))",
      }}
    >
      <div className="relative overflow-hidden rounded-[27px] bg-ink-2 px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
        {/* halos */}
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: m.competition.accent }}
        />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-neon/20 opacity-60 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 56px)",
          }}
        />

        <div className="relative flex items-center justify-between gap-3">
          <span className="font-display inline-flex items-center gap-2 rounded-full bg-neon px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
            <span>★</span> {finished ? "El partido del día" : "Partidazo del día"}
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-fg-2">
            <CompetitionLogo competition={m.competition} size={22} />
            <span className="hidden sm:inline">{m.competition.name}</span>
            <span className="sm:hidden">{m.competition.shortName}</span>
          </span>
        </div>

        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <FeaturedTeam team={m.home} />
          <div className="flex flex-col items-center gap-2">
            {finished ? (
              <div className="font-display text-glow flex items-baseline gap-2 text-5xl font-black tabular-nums text-fg sm:text-6xl">
                <span>{m.homeScore}</span>
                <span className="text-2xl text-muted">–</span>
                <span>{m.awayScore}</span>
              </div>
            ) : (
              <>
                <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-muted">vs</span>
                <div className="font-display text-glow text-5xl font-black tabular-nums text-neon sm:text-6xl">
                  {m.localTime}
                </div>
              </>
            )}
            {st.kind !== "scheduled" && <StatusChip status={st} />}
          </div>
          <FeaturedTeam team={m.away} />
        </div>

        {m.featuredBlurb && (
          <p className="relative mx-auto mt-6 max-w-xl text-center text-[15px] leading-relaxed text-fg-2">
            {m.featuredBlurb}
          </p>
        )}

        <div className="relative mt-5 flex justify-center">
          <Link
            href={`/partido/${m.id}/`}
            className="chip font-display inline-flex items-center gap-2 rounded-full bg-neon px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-ink shadow-[0_10px_30px_-12px_rgba(77,255,154,0.9)]"
          >
            Entrar al estadio 3D →
          </Link>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>{m.round}</span>
          {m.venue && (
            <>
              <span aria-hidden>·</span>
              <span>{m.venue}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>Hora uruguaya</span>
        </div>
      </div>
    </section>
  );
}

function FeaturedTeam({ team }: { team: MatchView["home"] }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-white/5 blur-xl" />
        <Crest team={team} size={88} priority className="sm:!h-28 sm:!w-28" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-sm font-bold leading-tight sm:text-base">{team.shortName}</div>
        {team.shortName !== team.name && (
          <div className="mt-0.5 truncate text-[11px] text-muted">{team.name}</div>
        )}
      </div>
    </div>
  );
}
