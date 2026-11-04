// Une data/teams.source.json + data/snapshot.matches.json → data/snapshot.json
// y valida: referencias, escudos presentes, horarios ISO válidos, sin "live".
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const src = JSON.parse(readFileSync("data/teams.source.json", "utf8"));
const m = JSON.parse(readFileSync("data/snapshot.matches.json", "utf8"));

const errors = [];
const teams = src.teams.map(({ id, name, shortName, country }) => {
  const crest = `/crests/${id}.png`;
  if (!existsSync(`public${crest}`)) errors.push(`falta escudo: ${id}`);
  return { id, name, shortName, country, crest };
});
const competitions = src.competitions.map(({ id, name, shortName, region, priority, accent }) => {
  const logo = `/competitions/${id}.png`;
  if (!existsSync(`public${logo}`)) errors.push(`falta logo de torneo: ${id}`);
  return { id, name, shortName, region, priority, accent, logo };
});

const teamIds = new Set(teams.map((t) => t.id));
const compIds = new Set(competitions.map((c) => c.id));
const seen = new Set();
for (const x of m.matches) {
  if (seen.has(x.id)) errors.push(`id duplicado: ${x.id}`);
  seen.add(x.id);
  if (!teamIds.has(x.homeId)) errors.push(`${x.id}: equipo desconocido ${x.homeId}`);
  if (!teamIds.has(x.awayId)) errors.push(`${x.id}: equipo desconocido ${x.awayId}`);
  if (!compIds.has(x.competitionId)) errors.push(`${x.id}: torneo desconocido ${x.competitionId}`);
  if (Number.isNaN(Date.parse(x.kickoffUtc)) || !x.kickoffUtc.endsWith("Z"))
    errors.push(`${x.id}: kickoffUtc inválido ${x.kickoffUtc}`);
  if (x.status === "live") errors.push(`${x.id}: el snapshot no puede declarar partidos en vivo`);
  if (x.status === "finished" && (x.homeScore == null || x.awayScore == null))
    errors.push(`${x.id}: finalizado sin marcador`);
  if (x.status !== "finished" && (x.homeScore != null || x.awayScore != null))
    errors.push(`${x.id}: marcador en partido no finalizado`);
}

if (errors.length) {
  // SKIP_CREST_CHECK=1 permite generar el snapshot mientras se bajan escudos (solo en desarrollo).
  const soft = process.env.SKIP_CREST_CHECK === "1" && errors.every((e) => e.startsWith("falta "));
  console[soft ? "warn" : "error"](errors.join("\n"));
  if (!soft) process.exit(1);
}

const usedTeams = new Set(m.matches.flatMap((x) => [x.homeId, x.awayId]));
const out = {
  meta: m.meta,
  teams: teams.filter((t) => usedTeams.has(t.id)),
  competitions,
  matches: m.matches,
};
writeFileSync("data/snapshot.json", JSON.stringify(out, null, 2));
console.log(`snapshot ok: ${out.matches.length} partidos, ${out.teams.length} equipos, ${competitions.length} torneos`);
