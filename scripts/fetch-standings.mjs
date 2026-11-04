// Tablas de posiciones desde Wikipedia en español (API de MediaWiki, licencia CC BY-SA).
// Sin IA: HTTP + parseo de HTML. Escribe data/standings.json. Pensado para el cron.
// Uso: node scripts/fetch-standings.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "node-html-parser";

const UA = "vasco-agenda/1.0 (https://github.com/nanobap/vasco-no-sabes-nada)";

/** Qué páginas y qué tablas (por encabezado previo) nos interesan. */
const SOURCES = [
  {
    competitionId: "uruguay",
    label: "Campeonato Uruguayo 2026",
    page: "Campeonato Uruguayo de Primera División 2026",
    tables: [
      { key: "uru-anual", label: "Tabla anual", match: /^tabla anual/i },
      { key: "uru-clausura", label: "Clausura", match: /^torneo clausura/i },
      { key: "uru-apertura", label: "Apertura", match: /^torneo apertura/i },
      { key: "uru-descenso", label: "Descenso", match: /^tabla del descenso/i },
    ],
  },
  {
    competitionId: "ucl",
    label: "Champions League 2026-27",
    page: "Liga de Campeones de la UEFA 2026-27",
    tables: [{ key: "ucl-liga", label: "Fase liga", match: /^clasificaci[oó]n$/i, minRows: 30 }],
  },
  {
    competitionId: "uel",
    label: "Europa League 2026-27",
    page: "Liga Europa de la UEFA 2026-27",
    tables: [{ key: "uel-liga", label: "Fase liga", match: /^clasificaci[oó]n$/i, minRows: 30 }],
  },
  {
    competitionId: "uecl",
    label: "Conference League 2026-27",
    page: "Liga Conferencia de la UEFA 2026-27",
    tables: [{ key: "uecl-liga", label: "Fase liga", match: /^clasificaci[oó]n$/i, minRows: 30 }],
  },
  {
    competitionId: "brasileirao",
    label: "Brasileirão 2026",
    page: "Campeonato Brasileño de Fútbol Serie A 2026",
    tables: [{ key: "bra-tabla", label: "Tabla", match: /clasificaci[oó]n|tabla de posiciones|posiciones/i, minRows: 18 }],
  },
  {
    competitionId: "lpf",
    label: "Liga Profesional Argentina 2026",
    page: "Campeonato de Primera División 2026 (Argentina)",
    tables: [
      { key: "arg-anual", label: "Tabla anual", match: /tabla general|tabla anual/i, minRows: 25 },
      // Las zonas aparecen dos veces (Apertura y Clausura): la última es el Clausura.
      { key: "arg-clausura-a", label: "Clausura · Zona A", match: /^zona a$/i, minRows: 12, pick: "last" },
      { key: "arg-clausura-b", label: "Clausura · Zona B", match: /^zona b$/i, minRows: 12, pick: "last" },
    ],
  },
];

// Equipos nuestros, para enlazar posiciones con los partidos
const src = JSON.parse(readFileSync("data/teams.source.json", "utf8"));
const ALIASES = {
  torque: ["montevideo city", "montevideo city torque"],
  wanderers: ["montevideo wanderers", "wanderers"],
  "liverpool-uru": ["liverpool"],
  "liverpool-eng": ["liverpool"],
  psg: ["paris saint germain", "paris saint-germain", "psg"],
  "manchester-city": ["manchester city"],
  "manchester-united": ["manchester united"],
  "atletico-madrid": ["atletico de madrid", "atletico madrid"],
  bayern: ["bayern munich", "bayern munchen", "bayern de munich"],
  inter: ["inter de milan", "internazionale", "inter"],
  milan: ["milan", "ac milan"],
  "red-star": ["estrella roja", "crvena zvezda"],
  copenhagen: ["copenhague", "fc copenhague"],
  "bodo-glimt": ["bodo/glimt", "bodo glimt"],
  "union-sg": ["union saint-gilloise", "union sg"],
  brugge: ["club brujas", "brujas", "club brugge"],
  "slavia-praha": ["slavia praga"],
  "sparta-praha": ["sparta praga"],
  "river-plate-arg": ["river plate", "river"],
  belgrano: ["belgrano"],
  aldosivi: ["aldosivi"],
  "gimnasia-lp": ["gimnasia y esgrima la plata", "gimnasia (lp)", "gimnasia la plata", "gimnasia y esgrima"],
  "athletico-pr": ["athletico paranaense"],
  "atletico-mineiro": ["atletico mineiro"],
  internacional: ["internacional", "inter de porto alegre"],
  "sao-paulo": ["sao paulo"],
};
const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const teamIndex = new Map();
for (const t of src.teams) {
  for (const n of [t.name, t.shortName, ...(ALIASES[t.id] ?? [])]) {
    const k = norm(n);
    if (!k) continue;
    const prev = teamIndex.get(k);
    teamIndex.set(k, prev && prev !== t.id ? `${prev}|${t.id}` : t.id);
  }
}
function teamIdFor(name, competitionId) {
  const k = norm(name);
  let id = teamIndex.get(k);
  if (!id) return null;
  if (id.includes("|")) {
    // homónimos (Liverpool): decidir por torneo
    const opts = id.split("|");
    const uy = competitionId === "uruguay";
    id = opts.find((o) => (uy ? o.endsWith("-uru") : !o.endsWith("-uru"))) ?? opts[0];
  }
  return id;
}

async function fetchPage(page) {
  const url = `https://es.wikipedia.org/w/api.php?action=parse&prop=text|revid&format=json&redirects=1&page=${encodeURIComponent(page)}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${page}`);
  const j = await res.json();
  if (j.error) throw new Error(`${page}: ${j.error.info}`);
  return { html: j.parse.text["*"], revid: j.parse.revid, title: j.parse.title };
}

const clean = (s) =>
  s
    .replace(/\[[^\]]*\]/g, "") // notas [a], [1]
    .replace(/​/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Recorre el HTML en orden: recuerda el último encabezado y devuelve las tablas de posiciones. */
function extractTables(html) {
  const root = parse(html);
  const out = [];
  let heading = "";
  let headingChain = [];
  const walk = (node) => {
    for (const el of node.childNodes) {
      if (el.nodeType !== 1) continue;
      const tag = el.tagName?.toLowerCase();
      if (tag === "h2" || tag === "h3" || tag === "h4") {
        heading = clean(el.text.replace(/\[editar\]/g, ""));
        headingChain = tag === "h2" ? [heading] : [...headingChain.slice(0, tag === "h3" ? 1 : 2), heading];
        continue;
      }
      if (tag === "table") {
        const rows = el.querySelectorAll("tr").map((tr) => tr.querySelectorAll("th,td").map((c) => clean(c.text)));
        if (rows.length >= 4) {
          const hdr = rows[0].map((h) => h.replace(/\.$/, ""));
          if (hdr.some((h) => ["Pos", "Pts", "PJ", "Equipo"].includes(h))) {
            out.push({ heading, chain: headingChain.join(" › "), headers: hdr, rows: rows.slice(1) });
          }
        }
        continue; // no bajar dentro de tablas
      }
      walk(el);
    }
  };
  walk(root);
  return out;
}

function toRows(table, competitionId) {
  const idx = (names) => table.headers.findIndex((h) => names.includes(h));
  const iPos = idx(["Pos", "Pos."]);
  const iTeam = idx(["Equipo", "Equipos"]);
  const iPts = idx(["Pts", "PTS", "Puntos"]);
  const iPj = idx(["PJ"]);
  const iDif = idx(["Dif", "DG", "DIF"]);
  return table.rows
    .filter((r) => r.length >= Math.max(iTeam, iPts) + 1 && r[iTeam])
    .map((r) => {
      const name = clean(r[iTeam]).replace(/\s*\((C|D|A|X|E|Q|O)\)\s*$/, "").trim();
      const values = {};
      table.headers.forEach((h, i) => {
        if (h && i !== iTeam && i !== iPos) values[h] = r[i] ?? "";
      });
      return {
        pos: parseInt((r[iPos] ?? "").replace(/[^\d]/g, ""), 10) || null,
        team: name,
        teamId: teamIdFor(name, competitionId),
        pts: iPts >= 0 ? r[iPts] : undefined,
        pj: iPj >= 0 ? r[iPj] : undefined,
        dif: iDif >= 0 ? r[iDif] : undefined,
        values,
      };
    })
    .filter((x) => x.team);
}

const result = { fetchedAtUtc: new Date().toISOString(), source: "Wikipedia (es), CC BY-SA 4.0", tables: [] };
for (const s of SOURCES) {
  let page;
  try {
    page = await fetchPage(s.page);
  } catch (e) {
    console.log(`✗ ${s.label}: ${e.message}`);
    continue;
  }
  const found = extractTables(page.html);
  for (const spec of s.tables) {
    const candidates = found.filter((f) => spec.match.test(f.heading) && f.rows.length >= (spec.minRows ?? 8));
    const t = spec.pick === "last" ? candidates[candidates.length - 1] : candidates[0];
    if (!t) {
      console.log(`  – ${s.label} / ${spec.label}: no encontrada (encabezados vistos: ${found.map((f) => f.heading).slice(0, 12).join(" | ")})`);
      continue;
    }
    const rows = toRows(t, s.competitionId);
    const linked = rows.filter((r) => r.teamId).length;
    result.tables.push({
      key: spec.key,
      competitionId: s.competitionId,
      group: s.label,
      label: spec.label,
      heading: t.heading,
      headers: t.headers,
      rows,
      sourceUrl: `https://es.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      revision: page.revid,
    });
    console.log(`✓ ${s.label} / ${spec.label}: ${rows.length} filas (${linked} enlazadas a nuestros equipos)`);
  }
}
writeFileSync("data/standings.json", JSON.stringify(result, null, 2));
console.log(`tablas: ${result.tables.length}`);
