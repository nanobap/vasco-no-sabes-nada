import type { MatchView } from "@/lib/types";
import { probabilityFor, pct } from "@/lib/probability";
import { Crest } from "./Crest";

export function ProbabilityCard({ match: m }: { match: MatchView }) {
  const p = probabilityFor(m);
  const elo = p.kind === "elo";
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
            {elo ? "Probabilidad (Elo)" : "Pálpito del Vasco"}
          </p>
          <h2 className="font-display mt-1 text-lg font-bold">{elo ? "¿Quién llega mejor?" : "Opinión, no estadística"}</h2>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
            elo ? "border-sky/40 bg-sky/10 text-sky" : "border-amber/40 bg-amber/10 text-amber"
          }`}
        >
          {elo ? "ClubElo" : "Vasco"}
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
        {elo ? (
          <>
            Estimación a partir de los ratings Elo de clubes ({m.home.shortName} {Math.round(p.homeElo)} · {m.away.shortName}{" "}
            {Math.round(p.awayElo)}
            {p.neutral ? ", cancha neutral" : ", con ventaja de localía"}), fuente {p.source}
            {p.date ? ` al ${p.date}` : ""}. Es una referencia, no una apuesta.
          </>
        ) : (
          <>
            No hay rating Elo público para estos clubes, así que opina el Vasco: <em>“{p.reason}”</em> Tomalo como lo
            que es.
          </>
        )}
      </p>
    </section>
  );
}
