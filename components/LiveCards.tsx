import type { MatchView } from "@/lib/types";
import { liveDetailsFor, liveMeta } from "@/lib/data/overlay";
import { formatStamp } from "@/lib/time";
import { Crest } from "./Crest";

/** Lesionados y pronóstico reales (API-Football). Solo se muestran si el cron los trajo. */
export function LiveCards({ match: m }: { match: MatchView }) {
  const d = liveDetailsFor(m.id);
  if (!d) return null;
  const inj = d.injuries ?? [];
  const p = d.prediction;
  const pct = (v: number | null) => (v == null ? "–" : `${Math.round(v * 100)}%`);
  const form = (f: string | null) =>
    f ? (
      <span className="inline-flex gap-1">
        {f
          .slice(-5)
          .split("")
          .map((c, i) => (
            <span
              key={i}
              className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black ${
                c === "W" ? "bg-neon/20 text-neon" : c === "L" ? "bg-rose/20 text-rose" : "bg-white/10 text-fg-2"
              }`}
            >
              {c === "W" ? "G" : c === "L" ? "P" : "E"}
            </span>
          ))}
      </span>
    ) : (
      <span className="text-muted">sin datos</span>
    );

  return (
    <>
      {p && (p.home != null || p.formHome || p.h2h?.length) && (
        <section className="card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">Pronóstico</p>
              <h2 className="font-display mt-1 text-lg font-bold">Cómo llegan</h2>
            </div>
            <span className="rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-sky">
              API-Football
            </span>
          </div>
          {p.home != null && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { l: m.home.shortName, v: p.home, t: m.home },
                { l: "Empate", v: p.draw, t: null },
                { l: m.away.shortName, v: p.away, t: m.away },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl border border-line bg-white/4 px-2 py-3">
                  <div className="flex justify-center">{x.t ? <Crest team={x.t} size={24} /> : <span className="h-6" />}</div>
                  <div className="font-display mt-1 text-2xl font-black tabular-nums">{pct(x.v)}</div>
                  <div className="truncate text-[11px] text-muted">{x.l}</div>
                </div>
              ))}
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Forma {m.home.shortName}</dt>
              <dd className="mt-1">{form(p.formHome)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Forma {m.away.shortName}</dt>
              <dd className="mt-1">{form(p.formAway)}</dd>
            </div>
          </dl>
          {p.h2h?.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Últimos cruces</p>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {p.h2h.map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate text-fg-2">
                      {h.home} <span className="text-muted">vs</span> {h.away}
                    </span>
                    <span className="font-display tabular-nums">
                      {h.homeGoals ?? "–"}–{h.awayGoals ?? "–"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.advice && <p className="mt-3 text-[12px] text-muted">Lectura del modelo: {p.advice}</p>}
          <p className="mt-2 text-[11px] text-muted">
            Pronóstico estadístico del proveedor, actualizado {formatStamp(d.updatedAtUtc)}. Referencia, no apuesta.
          </p>
        </section>
      )}

      <section className="card rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">Bajas</p>
            <h2 className="font-display mt-1 text-lg font-bold">Lesionados y suspendidos</h2>
          </div>
          <span className="rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-sky">
            API-Football
          </span>
        </div>
        {inj.length === 0 ? (
          <p className="mt-3 text-[13px] text-fg-2">Sin bajas reportadas para este partido al {formatStamp(d.updatedAtUtc)}.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["home", "away"] as const).map((side) => {
              const team = side === "home" ? m.home : m.away;
              const list = inj.filter((x) => x.team === side);
              return (
                <div key={side}>
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <Crest team={team} size={20} /> {team.shortName}
                    <span className="text-muted">({list.length})</span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {list.length === 0 && <li className="text-[12px] text-muted">Sin bajas.</li>}
                    {list.map((x, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate">{x.player}</span>
                        <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                          {x.reason || x.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {inj.some((x) => x.team === "unknown") && (
              <p className="text-[11px] text-muted sm:col-span-2">
                Otras bajas reportadas: {inj.filter((x) => x.team === "unknown").map((x) => x.player).join(", ")}.
              </p>
            )}
          </div>
        )}
      </section>
      {liveMeta.syncedAtUtc && (
        <p className="px-1 text-[11px] text-muted">
          Datos en vivo: {liveMeta.source}, última sincronización {formatStamp(liveMeta.syncedAtUtc)} (hora UY).
        </p>
      )}
    </>
  );
}
