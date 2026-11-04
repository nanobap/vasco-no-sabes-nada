// Sincroniza datos reales desde API-Football (api-sports.io) sobre el snapshot.
// Sin IA, sin agentes: HTTP + reglas. Pensado para correr en un cron (GitHub Actions)
// y respetar el presupuesto del plan gratuito (100 pedidos/día).
//
// Qué hace:
//  1. Por cada fecha del snapshot, pide /fixtures?date=YYYY-MM-DD (1 pedido por fecha)
//     y empareja cada partido nuestro por equipos + hora. Guarda estado y marcador reales.
//  2. Para los partidos "cercanos" (destacados o que empiezan/terminaron hace poco),
//     pide /injuries y /predictions (2 pedidos por partido), hasta el tope de la corrida.
//  3. Escribe data/live/fixtures.json, data/live/details.json y data/live/meta.json.
//     Los ids de equipo aprendidos quedan en data/apifootball-aliases.json.
//
// Uso: API_FOOTBALL_KEY=... node scripts/sync-api-football.mjs [--max-requests 20] [--details 6] [--dry-run]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const BASE = "https://v3.football.api-sports.io";
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const MAX_REQUESTS = Number(arg("--max-requests", 20));
const MAX_DETAILS = Number(arg("--details", 6));
const DRY = args.includes("--dry-run");
const PACE_MS = Number(arg("--pace-ms", 6500)); // plan gratuito: 10 pedidos por minuto
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

loadDotEnv();
const KEY = process.env.API_FOOTBALL_KEY;
if (!KEY && !DRY) {
  console.error("Falta API_FOOTBALL_KEY (ponela en .env.local o como secret del workflow).");
  process.exit(2);
}

const snapshot = JSON.parse(readFileSync("data/snapshot.json", "utf8"));
const aliasesPath = "data/apifootball-aliases.json";
const aliases = existsSync(aliasesPath) ? JSON.parse(readFileSync(aliasesPath, "utf8")) : { teams: {}, leagues: {} };
mkdirSync("data/live", { recursive: true });
const prevFixtures = existsSync("data/live/fixtures.json") ? JSON.parse(readFileSync("data/live/fixtures.json", "utf8")) : {};
const prevDetails = existsSync("data/live/details.json") ? JSON.parse(readFileSync("data/live/details.json", "utf8")) : {};

let used = 0;
async function api(path) {
  if (used >= MAX_REQUESTS) throw new Error(`presupuesto agotado (${MAX_REQUESTS})`);
  used += 1;
  if (DRY) {
    console.log("DRY GET", path);
    return { response: [] };
  }
  let res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": KEY } });
  if (res.status === 429) {
    console.log("429: espero 65 s y reintento");
    await sleep(65000);
    res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": KEY } });
  }
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  const json = await res.json();
  await sleep(PACE_MS);
  if (json.errors && Object.keys(json.errors).length) throw new Error(`API: ${JSON.stringify(json.errors)}`);
  return json;
}

// ---------- emparejamiento de equipos ----------
const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|ac|as|ss|sv|fk|nk|hnk|gnk|bk|if|sk|rc|rcd|ud|cd|ca|club|de|del|la|el|futbol|football|calcio|atletico|athletic|deportivo|sporting|real)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const EXTRA_ALIASES = {
  "liverpool-eng": ["liverpool"],
  "liverpool-uru": ["liverpool montevideo", "liverpool fc montevideo"],
  "river-plate-arg": ["river plate"],
  nacional: ["nacional montevideo", "club nacional de football"],
  "manchester-united": ["manchester utd", "man united"],
  "manchester-city": ["man city"],
  psg: ["paris saint germain", "paris sg"],
  inter: ["inter milan", "internazionale"],
  milan: ["ac milan"],
  "atletico-madrid": ["atletico madrid"],
  "red-star": ["crvena zvezda", "fk crvena zvezda", "red star belgrade"],
  copenhagen: ["fc copenhagen", "kobenhavn"],
  "hapoel-beer-sheva": ["hapoel beer sheva"],
  "union-sg": ["union st gilloise", "royale union saint gilloise"],
  "sint-truiden": ["st truiden", "sint truidense vv"],
  "sporting": ["sporting cp", "sporting lisbon"],
  "bodo-glimt": ["bodo glimt", "bodo/glimt"],
  "u-craiova": ["universitatea craiova", "cs universitatea craiova"],
  "athletico-pr": ["athletico paranaense", "atletico paranaense"],
  "atletico-mineiro": ["atletico mineiro", "atletico mg"],
  "gimnasia-lp": ["gimnasia l p", "gimnasia la plata", "gimnasia y esgrima la plata"],
  "ferro-carril-salto": ["ferro carril", "ferrocarril salto"],
  "libertad-san-carlos": ["libertad san carlos", "libertad"],
  "san-carlos": ["san carlos"],
  gladiador: ["gladiador"],
  lito: ["lito"],
  torque: ["montevideo city torque", "torque"],
  wanderers: ["montevideo wanderers", "wanderers"],
  rennes: ["stade rennais", "rennes"],
  olympiacos: ["olympiakos piraeus", "olympiakos", "olympiacos piraeus"],
  brugge: ["club brugge kv", "club brugge", "brugge"],
  psv: ["psv eindhoven", "psv"],
  lillestrom: ["lillestrom", "lillestrom sk"],
  plzen: ["viktoria plzen", "plzen"],
  salzburg: ["red bull salzburg", "rb salzburg", "salzburg"],
  leverkusen: ["bayer leverkusen", "leverkusen"],
  marseille: ["olympique marseille", "marseille"],
  thun: ["fc thun", "thun"],
  hearts: ["heart of midlothian", "hearts"],
  freiburg: ["sc freiburg", "freiburg"],
  monaco: ["as monaco", "monaco"],
  nordsjaelland: ["fc nordsjaelland", "nordsjaelland", "nordsjelland"],
  ferencvaros: ["ferencvarosi tc", "ferencvaros"],
  agf: ["aarhus", "agf aarhus", "aarhus gf"],
  copenhagen: ["fc copenhagen", "copenhagen", "kobenhavn"],
  "slavia-praha": ["slavia praha", "slavia prague"],
  "sparta-praha": ["sparta praha", "sparta prague"],
  besiktas: ["besiktas"],
  "dinamo-zagreb": ["dinamo zagreb"],
  lech: ["lech poznan"],
  pafos: ["pafos", "paphos"],
  "kauno-zalgiris": ["kauno zalgiris", "zalgiris kaunas"],
  "iberia-1999": ["iberia 1999", "iberia"],
  "inter-escaldes": ["inter club d escaldes", "inter escaldes"],
};

const teamsById = new Map(snapshot.teams.map((t) => [t.id, t]));
function namesFor(id) {
  const t = teamsById.get(id);
  const list = [t.name, t.shortName, ...(EXTRA_ALIASES[id] ?? [])];
  return list.map(norm).filter(Boolean);
}
function teamMatches(ourId, apiTeam) {
  if (aliases.teams[ourId] && Number(aliases.teams[ourId]) === apiTeam.id) return 1;
  const an = norm(apiTeam.name);
  if (!an) return 0;
  let best = 0;
  for (const n of namesFor(ourId)) {
    if (n === an) best = Math.max(best, 1);
    else if (an.includes(n) || n.includes(an)) best = Math.max(best, 0.8);
    else {
      const a = new Set(n.split(" "));
      const b = new Set(an.split(" "));
      const inter = [...a].filter((x) => b.has(x) && x.length > 2).length;
      if (inter) best = Math.max(best, inter / Math.max(a.size, b.size));
    }
  }
  return best;
}

// ---------- 1) fixtures por fecha ----------
const dates = [...new Set(snapshot.matches.map((m) => m.kickoffUtc.slice(0, 10)))].sort();
const fixtures = { ...prevFixtures };
const matched = [];
for (const date of dates) {
  let list;
  try {
    list = (await api(`/fixtures?date=${date}&timezone=UTC`)).response ?? [];
  } catch (e) {
    console.log(`fixtures ${date}: ${e.message}`);
    continue;
  }
  const ours = snapshot.matches.filter((m) => m.kickoffUtc.slice(0, 10) === date);
  for (const m of ours) {
    const ko = Date.parse(m.kickoffUtc);
    let best = null;
    for (const f of list) {
      const dt = Math.abs(Date.parse(f.fixture.date) - ko);
      if (dt > 3 * 3600 * 1000) continue;
      const sh = teamMatches(m.homeId, f.teams.home);
      const sa = teamMatches(m.awayId, f.teams.away);
      const score = sh * sa * (dt < 15 * 60 * 1000 ? 1 : 0.85);
      if (score > 0.45 && (!best || score > best.score)) best = { f, score, sh, sa };
    }
    if (!best) {
      const near = list
        .filter((f) => Math.abs(Date.parse(f.fixture.date) - ko) <= 3 * 3600 * 1000)
        .map((f) => ({ n: `${f.teams.home.name} vs ${f.teams.away.name}`, s: Math.max(teamMatches(m.homeId, f.teams.home), teamMatches(m.awayId, f.teams.away)) }))
        .filter((x) => x.s >= 0.3)
        .sort((a, b) => b.s - a.s)
        .slice(0, 3)
        .map((x) => `${x.n} (${x.s.toFixed(2)})`);
      console.log(`sin match API: ${m.id}${near.length ? ` · cercanos: ${near.join(" | ")}` : ""}`);
      continue;
    }
    const f = best.f;
    aliases.teams[m.homeId] = f.teams.home.id;
    aliases.teams[m.awayId] = f.teams.away.id;
    aliases.leagues[m.competitionId] = f.league.id;
    fixtures[m.id] = {
      apiFixtureId: f.fixture.id,
      leagueId: f.league.id,
      status: f.fixture.status.short,
      statusLong: f.fixture.status.long,
      elapsed: f.fixture.status.elapsed,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      venue: f.fixture.venue?.name ? `${f.fixture.venue.name}${f.fixture.venue.city ? ` · ${f.fixture.venue.city}` : ""}` : undefined,
      kickoffUtc: f.fixture.date,
      updatedAtUtc: new Date().toISOString(),
      confidence: Number(best.score.toFixed(2)),
    };
    matched.push(m);
  }
}

// ---------- 2) detalles para los partidos cercanos ----------
const now = Date.now();
const priority = (m) => {
  const ko = Date.parse(m.kickoffUtc);
  const hours = (ko - now) / 3600000;
  let p = 0;
  if (m.featured) p += 100;
  if (hours > -3 && hours < 12) p += 50; // hoy
  if (m.competitionId === "ucl") p += 10;
  if (m.competitionId === "copa-auf") p += 10;
  p -= Math.abs(hours) / 10;
  return p;
};
const details = { ...prevDetails };
const candidates = matched
  .filter((m) => fixtures[m.id])
  .filter((m) => {
    const d = details[m.id];
    const fresh = d && now - Date.parse(d.updatedAtUtc) < 6 * 3600000;
    const finished = ["FT", "AET", "PEN"].includes(fixtures[m.id].status);
    return !(fresh || (finished && d));
  })
  .sort((a, b) => priority(b) - priority(a))
  .slice(0, MAX_DETAILS);

for (const m of candidates) {
  const id = fixtures[m.id].apiFixtureId;
  try {
    const inj = (await api(`/injuries?fixture=${id}`)).response ?? [];
    const pred = (await api(`/predictions?fixture=${id}`)).response?.[0] ?? null;
    details[m.id] = {
      updatedAtUtc: new Date().toISOString(),
      injuries: inj.map((x) => ({
        team: x.team?.id === aliases.teams[m.homeId] ? "home" : x.team?.id === aliases.teams[m.awayId] ? "away" : "unknown",
        player: x.player?.name,
        type: x.player?.type,
        reason: x.player?.reason,
      })),
      prediction: pred
        ? {
            home: pct(pred.predictions?.percent?.home),
            draw: pct(pred.predictions?.percent?.draw),
            away: pct(pred.predictions?.percent?.away),
            advice: pred.predictions?.advice ?? null,
            formHome: pred.teams?.home?.league?.form ?? pred.teams?.home?.last_5?.form ?? null,
            formAway: pred.teams?.away?.league?.form ?? pred.teams?.away?.last_5?.form ?? null,
            comparison: pred.comparison
              ? { form: pred.comparison.form, att: pred.comparison.att, def: pred.comparison.def, total: pred.comparison.total }
              : null,
            h2h: (pred.h2h ?? []).slice(0, 5).map((h) => ({
              date: h.fixture?.date,
              home: h.teams?.home?.name,
              away: h.teams?.away?.name,
              homeGoals: h.goals?.home,
              awayGoals: h.goals?.away,
            })),
          }
        : null,
    };
    console.log(`detalles ${m.id}: ${inj.length} lesionados, pronóstico ${pred ? "sí" : "no"}`);
  } catch (e) {
    console.log(`detalles ${m.id}: ${e.message}`);
    break;
  }
}

function pct(s) {
  const n = parseFloat(String(s ?? "").replace("%", ""));
  return Number.isFinite(n) ? n / 100 : null;
}

// ---------- 3) escribir ----------
const meta = {
  source: "API-Football (api-sports.io)",
  syncedAtUtc: new Date().toISOString(),
  requestsUsed: used,
  matched: matched.length,
  total: snapshot.matches.length,
  dryRun: DRY,
};
if (!DRY) {
  writeFileSync("data/live/fixtures.json", JSON.stringify(fixtures, null, 2));
  writeFileSync("data/live/details.json", JSON.stringify(details, null, 2));
  writeFileSync("data/live/meta.json", JSON.stringify(meta, null, 2));
  writeFileSync(aliasesPath, JSON.stringify(aliases, null, 2));
}
console.log(JSON.stringify(meta));

function loadDotEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}
