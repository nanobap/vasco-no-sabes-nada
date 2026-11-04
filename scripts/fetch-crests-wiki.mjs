// Escudos desde la imagen principal del artículo de Wikipedia (o URL directa),
// según data/crest-sources.json. Solo baja lo que falta (o todo con --force).
// Uso: node scripts/fetch-crests-wiki.mjs [--force] [--only id1,id2]
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const UA = "vasco-agenda/1.0 (https://github.com/nanobap/vasco-no-sabes-nada)";
const srcs = JSON.parse(readFileSync("data/crest-sources.json", "utf8"));
const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIdx = args.indexOf("--only");
const only = onlyIdx >= 0 ? new Set(args[onlyIdx + 1].split(",")) : null;

mkdirSync("public/crests", { recursive: true });
mkdirSync("public/competitions", { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function wikiImage(spec) {
  const [lang, ...rest] = spec.split(":");
  const title = rest.join(":");
  const api = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=original|thumbnail|name&pithumbsize=512&pilicense=any&redirects=1&format=json&titles=${encodeURIComponent(title)}`;
  const res = await fetch(api, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  const j = await res.json();
  const page = Object.values(j.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) throw new Error(`artículo inexistente: ${spec}`);
  const file = page.pageimage ?? page.original?.source ?? "";
  const url = page.thumbnail?.source ?? page.original?.source;
  if (!url) throw new Error(`sin imagen principal: ${page.title}`);
  return { url, file, title: page.title };
}

async function normalize(buf, out, size = 256) {
  const trimmed = await sharp(buf).ensureAlpha().trim({ threshold: 8 }).toBuffer().catch(() => buf);
  await sharp(trimmed)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
}

const LOGO_HINT = /logo|crest|badge|escudo|emblem|wappen|\.svg$|fc|club|cf|sc|afc|ac_|_fk|kf_/i;
const report = { ok: [], review: [], missing: [] };

async function handle(kind, id, spec) {
  const out = `public/${kind}/${id}.png`;
  if (existsSync(out) && !force) return;
  try {
    let url = spec.url;
    let info = { file: "url directa", title: "" };
    if (!url && spec.wiki) {
      info = await wikiImage(spec.wiki);
      url = info.url;
    }
    if (!url) throw new Error("sin fuente");
    await normalize(await fetchBuf(url), out);
    const entry = { id, from: url, file: info.file, title: info.title };
    if (spec.wiki && !LOGO_HINT.test(info.file)) {
      report.review.push(entry);
      console.log("REVISAR", id, "<-", info.title, "|", info.file);
    } else {
      report.ok.push(entry);
      console.log("ok ", id, "<-", info.title || "url", "|", info.file);
    }
  } catch (e) {
    report.missing.push({ id, error: String(e.message ?? e) });
    console.log("MISSING", id, String(e.message ?? e));
  }
  await sleep(250);
}

for (const [id, spec] of Object.entries(srcs.teams)) {
  if (only && !only.has(id)) continue;
  await handle("crests", id, spec);
}
for (const [id, spec] of Object.entries(srcs.competitions)) {
  if (only && !only.has(id)) continue;
  await handle("competitions", id, spec);
}

writeFileSync("data/crests-wiki.report.json", JSON.stringify(report, null, 2));
console.log(`\nok: ${report.ok.length}, revisar: ${report.review.length}, faltan: ${report.missing.length}`);
if (report.missing.length) console.log("faltan:", report.missing.map((m) => m.id).join(", "));
