"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MatchView, SnapshotMeta } from "@/lib/types";
import { groupByCompetition, matchesQuery, pickFeatured } from "@/lib/agenda";
import { addDays, formatLongDay, formatShortDay, todayLocal } from "@/lib/time";
import { buildShareText, whatsappUrl } from "@/lib/share";
import { liveMeta } from "@/lib/data/overlay";
import { Header } from "./Header";
import { DayNav, type DayTab } from "./DayNav";
import { FeaturedMatch } from "./FeaturedMatch";
import { Filters } from "./Filters";
import { CompetitionSection } from "./CompetitionSection";
import { EmptyState } from "./EmptyState";
import { BottomBar } from "./BottomBar";
import dynamic from "next/dynamic";

// La intro trae three.js: se carga solo cuando hace falta y nunca en el servidor.
const IntroVasco = dynamic(() => import("./IntroVasco"), { ssr: false });

const INTRO_KEY = "vasco:intro:v1";

interface Props {
  matches: MatchView[];
  meta: SnapshotMeta;
  /** Fecha "hoy" por defecto para el render estático (se corrige en el cliente). */
  defaultToday: string;
}

export function Agenda({ matches, meta, defaultToday }: Props) {
  const [today, setToday] = useState(defaultToday);
  const [active, setActive] = useState(defaultToday);
  const [now, setNow] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [intro, setIntro] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fecha y reloj reales del dispositivo, en zona Montevideo (sincroniza con el
  // mundo exterior tras hidratar; por eso el setState vive en el efecto).
  useEffect(() => {
    const t = todayLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(t);
    setActive(t);
    setNow(Date.now());
    const iv = window.setInterval(() => setNow(Date.now()), 60_000);
    try {
      if (!sessionStorage.getItem(INTRO_KEY)) setIntro(true);
    } catch {
      setIntro(true);
    }
    return () => window.clearInterval(iv);
  }, []);

  const closeIntro = useCallback(() => {
    setIntro(false);
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* modo privado */
    }
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, MatchView[]>();
    for (const x of matches) {
      const arr = m.get(x.localDate) ?? [];
      arr.push(x);
      m.set(x.localDate, arr);
    }
    return m;
  }, [matches]);

  const tabs: DayTab[] = useMemo(
    () => [
      { ymd: addDays(today, -1), label: "Ayer", count: byDay.get(addDays(today, -1))?.length ?? 0 },
      { ymd: today, label: "Hoy", count: byDay.get(today)?.length ?? 0 },
      { ymd: addDays(today, 1), label: "Mañana", count: byDay.get(addDays(today, 1))?.length ?? 0 },
    ],
    [today, byDay],
  );

  const dayMatches = useMemo(() => byDay.get(active) ?? [], [byDay, active]);
  const competitionsToday = useMemo(
    () => groupByCompetition(dayMatches).map((g) => g.competition),
    [dayMatches],
  );
  const visible = useMemo(
    () => dayMatches.filter((m) => (!filter || m.competition.id === filter) && matchesQuery(m, query)),
    [dayMatches, filter, query],
  );
  const groups = useMemo(() => groupByCompetition(visible), [visible]);
  const featured = !filter && !query ? pickFeatured(dayMatches) : undefined;
  const filtering = !!filter || !!query.trim();

  const changeDay = (ymd: string) => {
    setActive(ymd);
    setFilter(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const share = async () => {
    const text = buildShareText(active, dayMatches);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelado: cae a wa.me */
      }
    }
    window.open(whatsappUrl(text), "_blank", "noopener");
  };

  const outOfSnapshot = active < meta.coversFrom || active > meta.coversTo;

  return (
    <>
      {intro && <IntroVasco onDone={closeIntro} />}

      <main className="relative z-[1] mx-auto w-full max-w-3xl px-4 pb-32">
        <Header count={tabs[1].count} verifiedAtUtc={meta.verifiedAtUtc} syncedAtUtc={liveMeta.syncedAtUtc} />

        <DayNav tabs={tabs} active={active} onChange={changeDay} />

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">
              {active === today ? "Partidos de hoy" : active < today ? "Lo que pasó ayer" : "Lo que viene mañana"}
            </h2>
            <p className="text-[13px] text-muted">{formatLongDay(active)} · hora uruguaya</p>
          </div>
          {filtering && (
            <span className="rounded-full border border-neon/40 bg-neon/10 px-3 py-1 text-[12px] font-semibold tabular-nums text-neon">
              {visible.length} de {dayMatches.length}
            </span>
          )}
        </div>

        <div className="mt-5 space-y-6">
          {featured && <FeaturedMatch match={featured} now={now} />}

          {dayMatches.length > 0 && (
            <Filters
              ref={searchRef}
              competitions={competitionsToday}
              selected={filter}
              onSelect={setFilter}
              query={query}
              onQuery={setQuery}
            />
          )}

          {groups.length > 0 ? (
            <div className="space-y-8">
              {groups.map((g) => (
                <CompetitionSection key={g.competition.id} group={g} now={now} />
              ))}
            </div>
          ) : dayMatches.length > 0 && filtering ? (
            <EmptyState
              title="Ni Vasco encontró ese partido"
              body="Probá con otro nombre o sacá el filtro de competición."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setFilter(null);
                    setQuery("");
                  }}
                  className="chip rounded-full border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon"
                >
                  Ver todos los de {formatShortDay(active)}
                </button>
              }
            />
          ) : outOfSnapshot ? (
            <EmptyState
              title="Esta fecha todavía no está cargada"
              body={`La agenda verificada cubre del ${formatShortDay(meta.coversFrom)} al ${formatShortDay(meta.coversTo)}. Cuando se actualice el snapshot vas a ver los partidos de este día acá.`}
            />
          ) : (
            <EmptyState
              title="Día sin fútbol (sí, existen)"
              body="No hay partidos de las competiciones que seguimos para este día. Aprovechá para explicarle la regla del offside al Vasco."
            />
          )}
        </div>

        <footer className="mt-14 space-y-4 border-t border-line pt-6 text-[12px] leading-relaxed text-muted">
          <p>
            <strong className="text-fg-2">¿Y la Libertadores, la Sudamericana, el Uruguayo?</strong> Solo mostramos
            competiciones con partidos en el día. Esta semana:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {meta.notes?.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p>
            Horarios en America/Montevideo. Los marcadores que aparecen son resultados finales verificados en al
            menos dos fuentes; esta versión no muestra resultados en vivo. Escudos y logos pertenecen a sus clubes y
            organizadores; se usan solo para identificarlos.
          </p>
          <details className="group">
            <summary className="cursor-pointer text-fg-2 hover:text-fg">Fuentes consultadas</summary>
            <ul className="mt-2 space-y-1 break-all pl-1">
              {meta.sources.map((s) => (
                <li key={s}>
                  <a href={s} target="_blank" rel="noopener noreferrer" className="text-sky/80 hover:text-sky">
                    {s.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <p className="font-display pt-2 text-[10px] uppercase tracking-[0.3em] text-muted/70">
            Hecho con bronca y cariño · Montevideo
          </p>
        </footer>
      </main>

      <BottomBar
        onHome={() => {
          changeDay(today);
          setQuery("");
        }}
        onShare={share}
        onVasco={() => setIntro(true)}
      />
    </>
  );
}
