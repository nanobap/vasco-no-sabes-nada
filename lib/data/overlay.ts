import type { AgendaSnapshot, Match, MatchStatus } from "@/lib/types";
import fixturesRaw from "@/data/live/fixtures.json";
import detailsRaw from "@/data/live/details.json";
import metaRaw from "@/data/live/meta.json";

/**
 * Capa "en vivo" sobre el snapshot (fase 2). Los JSON de data/live los escribe
 * scripts/sync-api-football.mjs desde un cron; acá solo se leen y se mezclan.
 * Nunca se inventa un marcador: si la API no respondió, queda el snapshot.
 */

export interface LiveFixture {
  apiFixtureId: number;
  leagueId: number;
  status: string; // código corto de API-Football (NS, 1H, HT, 2H, FT, PST, …)
  statusLong: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  kickoffUtc: string;
  updatedAtUtc: string;
  confidence: number;
}

export interface LiveInjury {
  team: "home" | "away" | "unknown";
  player: string;
  type: string;
  reason: string;
}

export interface LivePrediction {
  home: number | null;
  draw: number | null;
  away: number | null;
  advice: string | null;
  formHome: string | null;
  formAway: string | null;
  comparison: { form?: Rec; att?: Rec; def?: Rec; total?: Rec } | null;
  h2h: Array<{ date: string; home: string; away: string; homeGoals: number | null; awayGoals: number | null }>;
}
type Rec = { home: string; away: string };

export interface LiveDetails {
  updatedAtUtc: string;
  injuries: LiveInjury[];
  prediction: LivePrediction | null;
}

export interface LiveMeta {
  source: string;
  syncedAtUtc: string | null;
  requestsUsed: number;
  matched: number;
  total: number;
}

const fixtures = fixturesRaw as unknown as Record<string, LiveFixture>;
const details = detailsRaw as unknown as Record<string, LiveDetails>;
export const liveMeta = metaRaw as unknown as LiveMeta;

const FINISHED = new Set(["FT", "AET", "PEN"]);
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const POSTPONED = new Set(["PST", "CANC", "ABD", "SUSP", "AWD", "WO"]);
/** Un estado "en vivo" solo vale si la sincronización es reciente. */
const LIVE_TTL_MS = 25 * 60 * 1000;

export function liveFixtureFor(matchId: string): LiveFixture | undefined {
  return fixtures[matchId];
}
export function liveDetailsFor(matchId: string): LiveDetails | undefined {
  return details[matchId];
}
export function hasLiveData(): boolean {
  return Object.keys(fixtures).length > 0;
}

/** Aplica estado y marcador reales (si existen) sobre cada partido del snapshot. */
export function applyOverlay(snapshot: AgendaSnapshot, now = Date.now()): AgendaSnapshot {
  if (!hasLiveData()) return snapshot;
  const matches: Match[] = snapshot.matches.map((m) => {
    const f = fixtures[m.id];
    if (!f) return m;
    const fresh = now - Date.parse(f.updatedAtUtc) < LIVE_TTL_MS;
    let status: MatchStatus = m.status;
    let homeScore = m.homeScore;
    let awayScore = m.awayScore;
    if (FINISHED.has(f.status) && f.homeScore != null && f.awayScore != null) {
      status = "finished";
      homeScore = f.homeScore;
      awayScore = f.awayScore;
    } else if (LIVE.has(f.status) && fresh) {
      status = "live";
      homeScore = f.homeScore;
      awayScore = f.awayScore;
    } else if (POSTPONED.has(f.status)) {
      status = "postponed";
    }
    return { ...m, status, homeScore, awayScore, venue: m.venue ?? f.venue };
  });
  return { ...snapshot, matches };
}
