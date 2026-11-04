import standingsRaw from "@/data/standings.json";

export interface StandingRow {
  pos: number | null;
  team: string;
  teamId: string | null;
  pts?: string;
  pj?: string;
  dif?: string;
  values: Record<string, string>;
}

export interface StandingTable {
  key: string;
  competitionId: string; // "uruguay" | "ucl" | "uel" | "uecl" | "brasileirao" | "lpf"
  group: string;
  label: string;
  heading: string;
  headers: string[];
  rows: StandingRow[];
  sourceUrl: string;
  revision: number;
}

export interface StandingsFile {
  fetchedAtUtc: string;
  source: string;
  tables: StandingTable[];
}

export const standings = standingsRaw as unknown as StandingsFile;

/** Tablas que aplican a un torneo de nuestra agenda. */
const COMP_TO_TABLES: Record<string, string[]> = {
  "copa-auf": ["uru-anual", "uru-clausura"],
  ucl: ["ucl-liga"],
  uel: ["uel-liga"],
  uecl: ["uecl-liga"],
  brasileirao: ["bra-tabla"],
  lpf: ["arg-anual", "arg-clausura-a", "arg-clausura-b"],
};

export interface TeamPosition {
  tableKey: string;
  label: string;
  pos: number;
  pts?: string;
  total: number;
}

/** Posiciones de un equipo en las tablas relevantes para el torneo del partido. */
export function positionsFor(teamId: string, competitionId: string): TeamPosition[] {
  const keys = COMP_TO_TABLES[competitionId] ?? [];
  const out: TeamPosition[] = [];
  for (const key of keys) {
    const t = standings.tables.find((x) => x.key === key);
    if (!t) continue;
    const row = t.rows.find((r) => r.teamId === teamId);
    if (row?.pos) out.push({ tableKey: key, label: t.label, pos: row.pos, pts: row.pts, total: t.rows.length });
  }
  return out;
}

export function ordinal(n: number): string {
  return `${n}º`;
}
