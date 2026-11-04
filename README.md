# VASCO, NO SABÉS NADA ⚽

Agenda diaria de fútbol para compartir en el grupo. Horarios en **America/Montevideo**, escudos reales, sin resultados inventados.

**URL pública:** https://nanobap.github.io/vasco-no-sabes-nada/

## Stack

- Next.js 16 (App Router, `output: "export"`) + TypeScript + Tailwind v4
- Sin backend: la agenda es un **snapshot verificado a mano** embebido en el build (`data/snapshot.json`)
- Hosting: GitHub Pages (rama `gh-pages`, basePath `/vasco-no-sabes-nada`)

## Cómo actualizar la agenda

1. Editá `data/snapshot.matches.json` (partidos, estado, marcadores finales verificados) y `meta.verifiedAtUtc`.
2. Si aparece un equipo nuevo, agregalo a `data/teams.source.json` y bajá su escudo:
   ```bash
   node scripts/fetch-crests.mjs --only nuevo-equipo
   ```
3. Generá y validá el snapshot (falla si falta un escudo, una referencia o si alguien declara un partido "live"):
   ```bash
   node scripts/build-snapshot.mjs
   ```
4. Build + deploy:
   ```bash
   npm run deploy
   ```

## Reglas de datos

- `kickoffUtc` siempre en UTC con `Z`. La UI formatea en Montevideo.
- `status: "finished"` solo con marcador verificado en ≥2 fuentes. Nunca `live` en el snapshot.
- Si por horario un partido ya empezó, la UI dice explícitamente que **no hay marcador en vivo** (no finge).
- Escudos: PNG transparentes normalizados a 256×256 en `public/crests/<id>.png`, descargados desde TheSportsDB.
  Pertenecen a sus clubes; se usan únicamente para identificarlos (uso nominativo).

## Fase 2 (preparada, no implementada)

La UI consume solo el contrato `AgendaProvider` (`lib/data/provider.ts`). Para resultados en vivo:

- Implementar `LiveProvider` (`lib/data/liveProvider.ts`): HTTP a una API deportiva, normalización a `Match[]`,
  caché memoria + localStorage con TTL, polling adaptativo (30-60 s con partidos en curso, 10-15 min si no),
  pausa con la pestaña oculta, fallback al último caché con marca de tiempo.
- Activar con `NEXT_PUBLIC_DATA_SOURCE=live` y `NEXT_PUBLIC_LIVE_ENDPOINT=...` (idealmente un proxy mínimo que
  esconda la API key).
- Solo HTTP y lógica convencional. Nada de modelos de IA para "deducir" resultados.

## Scripts

| Script | Qué hace |
|---|---|
| `scripts/fetch-crests.mjs` | Baja escudos y logos de torneos (TheSportsDB) y los normaliza |
| `scripts/build-snapshot.mjs` | Une equipos + partidos, valida y escribe `data/snapshot.json` |
| `scripts/og.mjs` | Genera `public/og.png` (1200×630) e íconos |
| `scripts/vasco-photo.mjs` | Recorta y escala la foto del Vasco para la intro |
| `scripts/deploy.mjs` | Publica `out/` en la rama `gh-pages` |
