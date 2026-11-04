import type { MatchView } from "./types";
import eloData from "@/data/elo.json";

interface EloFile {
  source: string;
  date: string | null;
  fetchedAtUtc: string | null;
  ratings: Record<string, { club: string; elo: number }>;
  missing: string[];
}
const ELO = eloData as unknown as EloFile;

export type Probability =
  | {
      kind: "elo";
      home: number;
      draw: number;
      away: number;
      homeElo: number;
      awayElo: number;
      neutral: boolean;
      source: string;
      date: string | null;
    }
  | {
      kind: "palpito";
      home: number;
      draw: number;
      away: number;
      reason: string;
    };

const HOME_ADV = 80; // ventaja de localía en puntos Elo (valor habitual en fútbol)

/** Probabilidad desde Elo (ClubElo): victoria/empate/derrota del local. */
export function eloProbability(homeElo: number, awayElo: number, neutral: boolean) {
  const dr = homeElo + (neutral ? 0 : HOME_ADV) - awayElo;
  const expHome = 1 / (1 + Math.pow(10, -dr / 400));
  // El Elo no modela el empate; aproximación habitual: más empates cuanto más parejos.
  const draw = clamp(0.3 - Math.abs(dr) * 0.00045, 0.12, 0.3);
  const home = (1 - draw) * expHome;
  const away = 1 - draw - home;
  return { home, draw, away };
}

/** Sedes neutrales conocidas en el snapshot (partido en otra ciudad por fuerza mayor). */
const NEUTRAL_HINT = /neutral|Londres\)|Bucarest|Leiria|Tampere|Helsingborg|Randers|Tacuaremb/i;

export function probabilityFor(m: MatchView): Probability {
  const h = ELO.ratings[m.home.id];
  const a = ELO.ratings[m.away.id];
  if (h && a) {
    const neutral = NEUTRAL_HINT.test(m.venue ?? "");
    const p = eloProbability(h.elo, a.elo, neutral);
    return { kind: "elo", ...p, homeElo: h.elo, awayElo: a.elo, neutral, source: ELO.source, date: ELO.date };
  }
  return vascoPalpito(m);
}

/**
 * "Pálpito del Vasco": NO es estadística. Es una opinión determinista (misma
 * para todos los que abran el partido) con localía y un toque de azar fijo.
 */
export function vascoPalpito(m: MatchView): Probability {
  const seed = hash(m.id);
  const r1 = ((seed % 1000) / 1000) * 0.3 - 0.15; // -0.15..0.15
  let home = 0.42 + r1;
  let draw = 0.26;
  if (/Octavos|Cuartos|Semifinal|Final/i.test(m.round ?? "")) draw = 0.3;
  let away = 1 - home - draw;
  if (away < 0.12) {
    away = 0.12;
    home = 1 - draw - away;
  }
  const reasons = [
    "Porque el local juega con la gente, y la gente grita.",
    "Lo vi en un sueño. No sé de quién era el sueño.",
    "Me lo dijo el del quiosco, que sabe.",
    "Por la camiseta. Siempre por la camiseta.",
    "Estadística pura: tiré una moneda tres veces.",
    "No tengo idea, pero hay que mojarse.",
  ];
  return { kind: "palpito", home, draw, away, reason: reasons[seed % reasons.length] };
}

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
