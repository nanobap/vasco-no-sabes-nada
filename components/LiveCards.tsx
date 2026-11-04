import type { MatchView } from "@/lib/types";
import { liveDetailsFor, liveMeta } from "@/lib/data/overlay";
import { formatStamp } from "@/lib/time";
import { Crest } from "./Crest";

/** Lesionados y pronóstico reales (API-Football). Solo se muestran si el cron los trajo. */
export function LiveCards({ match: m }: { match: MatchView }) {
  const d = liveDetailsFor(m.id);
  if (!d) return null;
  // La API repite jugadores (una entrada por tipo de baja); nos quedamos con uno por jugador y equipo.
  const seen = new Set<string>();
  const inj = (d.injuries ?? []).filter((x) => {
    const k = `${x.team}|${x.player}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const p = d.prediction;
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
      {p && (p.comparison || p.formHome || p.h2h?.length) && (
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
          {p.comparison && (
            <div className="mt-4 space-y-2.5">
              {(
                [
                  ["total", "Fuerza total"],
                  ["form", "Forma"],
                  ["att", "Ataque"],
                  ["def", "Defensa"],
                ] as const
              ).map(([key, label]) => {
                const rec = p.comparison?.[key];
                if (!rec) return null;
                const h = parseFloat(rec.home) || 0;
                const a = parseFloat(rec.away) || 0;
                const sum = h + a || 1;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-[12px]">
                      <span className="font-display tabular-nums text-fg">{Math.round((h / sum) * 100)}%</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
                      <span className="font-display tabular-nums text-fg">{Math.round((a / sum) * 100)}%</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-white/6">
                      <div className="h-full" style={{ width: `${(h / sum) * 100}%`, background: m.home.color ?? "#4dff9a" }} />
                      <div className="h-full flex-1" style={{ background: m.away.color ?? "#7dd3fc", opacity: 0.85 }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Crest team={m.home} size={16} /> {m.home.shortName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {m.away.shortName} <Crest team={m.away} size={16} />
                </span>
              </div>
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
            Comparativa estadística del proveedor (no es probabilidad de victoria), actualizada {formatStamp(d.updatedAtUtc)}.
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
