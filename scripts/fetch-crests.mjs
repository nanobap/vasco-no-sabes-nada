// Descarga escudos reales desde TheSportsDB (PNG transparentes) a /public/crests
// y logos de torneos a /public/competitions. Normaliza a 256x256 (contain).
//
// Estrategia: primero baja el plantel de equipos de cada liga/copa (1 request por
// torneo) y arma un índice por nombre; solo usa la búsqueda por nombre para lo que
// no aparece. El plan gratuito permite ~30 req/min, así que hay que ser frugal.
//
// Uso: node scripts/fetch-crests.mjs [--only id1,id2] [--force]
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const KEY = process.env.TSDB_KEY ?? "123";
const API = `https://www.thesportsdb.com/api/v1/json/${KEY}`;
const src = JSON.parse(readFileSync("data/teams.source.json", "utf8"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(",")) : null;

mkdirSync("public/crests", { recursive: true });
mkdirSync("public/competitions", { recursive: true });

// Torneos cuyos planteles se bajan de una (id TheSportsDB)
const ROSTER_LEAGUES = ["4480", "4481", "5071", "4432", "4351", "4406"];

const COUNTRY = {
  URU: "Uruguay", ARG: "Argentina", BRA: "Brazil", ENG: "England", ESP: "Spain", ITA: "Italy",
  GER: "Germany", FRA: "France", POR: "Portugal", NED: "Netherlands", BEL: "Belgium", TUR: "Turkey",
  GRE: "Greece", SCO: "Scotland", AUT: "Austria", SUI: "Switzerland", CZE: "Czech Republic",
  POL: "Poland", DEN: "Denmark", NOR: "Norway", SWE: "Sweden", FIN: "Finland", HUN: "Hungary",
  CRO: "Croatia", SRB: "Serbia", SVK: "Slovakia", SVN: "Slovenia", BUL: "Bulgaria", ROU: "Romania",
  UKR: "Ukraine", ISR: "Israel", CYP: "Cyprus", KAZ: "Kazakhstan", AZE: "Azerbaijan", ARM: "Armenia",
  GEO: "Georgia", LTU: "Lithuania", LVA: "Latvia", GIB: "Gibraltar", AND: "Andorra", BIH: "Bosnia and Herzegovina",
  ALB: "Albania",
};
const COUNTRY_ALIASES = {
  "Czech Republic": ["Czechia"],
  Netherlands: ["The Netherlands", "Holland"],
  Turkey: ["Türkiye"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function getJson(url) {
  for (let i = 0; i < 7; i++) {
    const res = await fetch(url, { headers: { "user-agent": "vasco-agenda/1.0" } });
    if (res.status === 429) {
      const wait = [5000, 10000, 20000, 30000, 45000, 60000, 90000][i];
      console.log(`  429 -> espero ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`rate limited ${url}`);
}

async function download(url) {
  const res = await fetch(url, { headers: { "user-agent": "vasco-agenda/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function normalize(buf, out, size = 256) {
  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 8 }).toBuffer().catch(() => buf);
  await sharp(trimmed)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
}

function countryOk(team, t) {
  const wanted = t.tsdbCountry ?? COUNTRY[t.country];
  if (!wanted) return true;
  const ok = [wanted, ...(COUNTRY_ALIASES[wanted] ?? [])];
  return ok.includes(team.strCountry);
}

function pickFrom(pool, t) {
  const q = norm(t.q);
  const byCountry = pool.filter((x) => countryOk(x, t));
  const cands = byCountry.length ? byCountry : pool;
  const names = (x) => [x.strTeam, x.strTeamShort, x.strTeamAlternate].filter(Boolean).flatMap((n) => n.split(",")).map(norm);
  return (
    cands.find((x) => names(x).includes(q)) ??
    cands.find((x) => names(x).some((n) => n.startsWith(q) || q.startsWith(n))) ??
    cands.find((x) => names(x).some((n) => n.includes(q) || q.includes(n))) ??
    null
  );
}

const pending = src.teams.filter((t) => (only ? only.has(t.id) : true) && (force || !existsSync(`public/crests/${t.id}.png`)));
const report = { ok: [], missing: [] };

// 1) Planteles por torneo (pocas requests)
const roster = [];
if (pending.some((t) => !t.url && !t.tsdbId)) {
  for (const id of ROSTER_LEAGUES) {
    try {
      const j = await getJson(`${API}/lookup_all_teams.php?id=${id}`);
      const teams = j.teams ?? [];
      roster.push(...teams);
      console.log(`plantel ${id}: ${teams.length} equipos`);
    } catch (e) {
      console.log(`plantel ${id}: error ${e.message}`);
    }
    await sleep(2200);
  }
}

// 2) Resolver cada equipo
for (const t of pending) {
  const out = `public/crests/${t.id}.png`;
  try {
    let picked = null;
    let badgeUrl = t.url ?? null;
    if (!badgeUrl && t.tsdbId) {
      picked = roster.find((x) => x.idTeam === String(t.tsdbId)) ?? null;
      if (!picked) {
        const j = await getJson(`${API}/lookupteam.php?id=${t.tsdbId}`);
        picked = j.teams?.[0] ?? null;
        await sleep(2200);
      }
    } else if (!badgeUrl) {
      picked = pickFrom(roster, t);
      if (!picked) {
        const j = await getJson(`${API}/searchteams.php?t=${encodeURIComponent(t.q)}`);
        const pool = (j.teams ?? []).filter((x) => (x.strSport ?? "Soccer") === "Soccer");
        picked = pickFrom(pool, t) ?? pool.find((x) => countryOk(x, t)) ?? null;
        await sleep(2200);
      }
    }
    if (picked) badgeUrl = picked.strBadge ?? picked.strTeamBadge ?? null;
    if (!badgeUrl) throw new Error("sin badge");
    await normalize(await download(badgeUrl), out);
    report.ok.push({ id: t.id, from: badgeUrl, tsdb: picked ? `${picked.idTeam} ${picked.strTeam} (${picked.strCountry})` : "url" });
    console.log("ok ", t.id, "<-", picked ? `${picked.strTeam} [${picked.strCountry}]` : badgeUrl);
  } catch (e) {
    report.missing.push({ id: t.id, error: String(e.message ?? e) });
    console.log("MISSING", t.id, String(e.message ?? e));
  }
}

// 3) Logos de torneos
for (const c of src.competitions) {
  if (only && !only.has(c.id)) continue;
  const out = `public/competitions/${c.id}.png`;
  if (existsSync(out) && !force) continue;
  try {
    const j = await getJson(`${API}/lookupleague.php?id=${c.tsdbLeagueId}`);
    const l = j.leagues?.[0];
    const url = c.url ?? l?.strBadge ?? l?.strLogo;
    if (!url) throw new Error("sin logo");
    await normalize(await download(url), out);
    console.log("ok ", c.id, "<-", l?.strLeague);
  } catch (e) {
    report.missing.push({ id: c.id, error: String(e.message ?? e) });
    console.log("MISSING", c.id, String(e.message ?? e));
  }
  await sleep(2200);
}

writeFileSync("data/crests.report.json", JSON.stringify(report, null, 2));
console.log(`\nlistos: ${report.ok.length}, faltan: ${report.missing.length}`);
if (report.missing.length) console.log(report.missing.map((m) => m.id).join(", "));
