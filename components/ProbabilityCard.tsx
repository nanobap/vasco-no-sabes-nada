import type { MatchView } from "@/lib/types";
import { probabilityFor, pct } from "@/lib/probability";
import { Crest } from "./Crest";

export function ProbabilityCard({ match: m }: { match: MatchView }) {
  const p = probabilityFor(m);
  // Sin rating real no se muestra ningún porcentaje: nada de números inventados.
  if (p.kind !== "elo") return null;
  const bars = [
    { label: m.home.shortName, v: p.home, color: m.home.color ?? "#4dff9a", team: m.home },
    { label: "Empate", v: p.draw, color: "#8b98a8", team: null },
    { label: m.away.shortName, v: p.away, color: m.away.color ?? "#7dd3fc", team: m.away },
  ];
  return (
    <section className="card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">
            Probabilidad (Elo)
          </p>
          <h2 className="font-display mt-1 text-lg font-bold">¿Quién llega mejor?</h2>
        </div>
        <span
          className="rounded-full border border-sky/40 bg-sky/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-sky"
        >
          ClubElo
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="inline-flex items-center gap-2 font-semibold">
                {b.team && <Crest team={b.team} size={18} />}
                {b.label}
              </span>
              <span className="font-display tabular-nums text-fg">{pct(b.v)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: pct(b.v), background: `linear-gradient(90deg, ${b.color}, ${b.color}cc)` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-muted">
        Estimación a partir de los ratings Elo de clubes ({m.home.shortName} {Math.round(p.homeElo)} · {m.away.shortName}{" "}
        {Math.round(p.awayElo)}
        {p.neutral ? ", cancha neutral" : ", con ventaja de localía"}), fuente {p.source}
        {p.date ? ` al ${p.date}` : ""}. Es una referencia, no una apuesta.
      </p>
    </section>
  );
}
