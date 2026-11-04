import type { AgendaSnapshot, Competition, Match, MatchView, Team } from "./types";
import { toLocalDate, toLocalTime } from "./time";

/** Resuelve ids → entidades y agrega fecha/hora local. Falla fuerte si falta algo. */
export function buildViews(snapshot: AgendaSnapshot): MatchView[] {
  const teams = new Map<string, Team>(snapshot.teams.map((t) => [t.id, t]));
  const comps = new Map<string, Competition>(snapshot.competitions.map((c) => [c.id, c]));

  return snapshot.matches
    .map((m): MatchView => {
      const home = teams.get(m.homeId);
      const away = teams.get(m.awayId);
      const competition = comps.get(m.competitionId);
      if (!home || !away || !competition) {
        throw new Error(
          `Partido ${m.id}: referencia rota (home=${m.homeId}, away=${m.awayId}, comp=${m.competitionId})`,
        );
      }
      return {
        ...m,
        home,
        away,
        competition,
        localDate: toLocalDate(m.kickoffUtc),
        localTime: toLocalTime(m.kickoffUtc),
      };
    })
    .sort(sortMatches);
}

export function sortMatches(a: MatchView, b: MatchView): number {
  if (a.competition.priority !== b.competition.priority) {
    return a.competition.priority - b.competition.priority;
  }
  return a.kickoffUtc.localeCompare(b.kickoffUtc);
}

export interface CompetitionGroup {
  competition: Competition;
  matches: MatchView[];
}

export function groupByCompetition(matches: MatchView[]): CompetitionGroup[] {
  const groups = new Map<string, CompetitionGroup>();
  for (const m of matches) {
    const g = groups.get(m.competition.id);
    if (g) g.matches.push(m);
    else groups.set(m.competition.id, { competition: m.competition, matches: [m] });
  }
  return [...groups.values()].sort(
    (a, b) => a.competition.priority - b.competition.priority,
  );
}

/** Partido destacado del día: el marcado `featured`; si no hay, el de mayor prioridad. */
export function pickFeatured(matches: MatchView[]): MatchView | undefined {
  return matches.find((m) => m.featured) ?? matches[0];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function matchesQuery(m: MatchView, q: string): boolean {
  const n = norm(q.trim());
  if (!n) return true;
  return [m.home.name, m.home.shortName, m.away.name, m.away.shortName, m.competition.name]
    .map(norm)
    .some((s) => s.includes(n));
}

export function isFinished(m: Match): boolean {
  return m.status === "finished" && m.homeScore != null && m.awayScore != null;
}

/** Hay marcador para mostrar: terminado o en vivo con datos frescos. */
export function hasScore(m: Match): boolean {
  return (m.status === "finished" || m.status === "live") && m.homeScore != null && m.awayScore != null;
}
