"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchView } from "@/lib/types";
import { asset } from "@/lib/site";
import { isFinished } from "@/lib/agenda";
import type { StadiumHandle } from "./stadium3d/stadium";
import { Crest } from "./Crest";
import { CompetitionLogo } from "./CompetitionLogo";

/**
 * Cabecera del partido: el estadio 3D queda pegado (sticky) mientras el usuario
 * hace scroll y la cámara baja de la vista aérea al césped.
 */
export function MatchHero({ match: m }: { match: MatchView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<StadiumHandle | null>(null);
  const [ready, setReady] = useState(false);
  const finished = isFinished(m);

  useEffect(() => {
    let cancelled = false;
    let handle: StadiumHandle | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./stadium3d/stadium").then(({ mountStadium }) => {
      if (cancelled || !canvasRef.current) return;
      handle = mountStadium(canvasRef.current, {
        homeCrest: asset(m.home.crest),
        awayCrest: asset(m.away.crest),
        homeColor: m.home.color ?? "#4dff9a",
        awayColor: m.away.color ?? "#7dd3fc",
        homeName: m.home.shortName,
        awayName: m.away.shortName,
        kickoff: m.localTime,
        score: finished ? `${m.homeScore}-${m.awayScore}` : null,
        competition: m.competition.name,
        reduced,
      });
      handleRef.current = handle;
      setReady(true);
    });
    const onScroll = () => {
      const el = wrapRef.current;
      if (!el || !handleRef.current) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = total > 0 ? -el.getBoundingClientRect().top / total : 0;
      handleRef.current.setProgress(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      handle?.destroy();
      handleRef.current = null;
    };
  }, [m, finished]);

  return (
    <div ref={wrapRef} className="relative -mx-4 h-[190svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Estadio 3D: ${m.home.name} contra ${m.away.name}`} />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display animate-pulse text-xs uppercase tracking-[0.3em] text-muted">Prendiendo las luces…</span>
          </div>
        )}
        {/* degradé para legibilidad */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/80 to-transparent" />

        {/* Overlay: enfrentamiento */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neon">
              <CompetitionLogo competition={m.competition} size={18} />
              {m.competition.name} · {m.round}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <Crest team={m.home} size={72} priority />
                <span className="font-display text-sm font-bold leading-tight sm:text-base">{m.home.name}</span>
              </div>
              <div className="flex flex-col items-center">
                {finished ? (
                  <span className="font-display text-glow text-5xl font-black tabular-nums text-fg">
                    {m.homeScore}–{m.awayScore}
                  </span>
                ) : (
                  <span className="font-display text-glow text-5xl font-black tabular-nums text-neon">{m.localTime}</span>
                )}
                <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted">{finished ? "Final" : "Hora UY"}</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <Crest team={m.away} size={72} priority />
                <span className="font-display text-sm font-bold leading-tight sm:text-base">{m.away.name}</span>
              </div>
            </div>
            <p className="mt-5 text-center text-[11px] uppercase tracking-[0.25em] text-muted">Deslizá para entrar a la cancha ↓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchHero;
