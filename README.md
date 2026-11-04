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

## Fase 2: datos reales con API-Football (listo, falta la clave)

Sin backend ni agentes: un cron de GitHub Actions (`.github/workflows/sync.yml`) corre
`scripts/sync-api-football.mjs`, que con HTTP común:

1. Pide `/fixtures?date=` por cada día del snapshot (1 pedido por día) y empareja cada partido nuestro por
   equipos + hora. Guarda estado y marcador reales en `data/live/fixtures.json`.
2. Para los partidos más cercanos (destacados, de hoy) pide `/injuries` y `/predictions`
   (2 pedidos por partido, tope `--details`). Guarda `data/live/details.json`.
3. Commitea `data/live` a `main`, hace el build y publica en `gh-pages`.

La web mezcla eso sobre el snapshot (`lib/data/overlay.ts`): resultados finales, "en vivo" solo si la
sincronización tiene menos de 25 minutos, postergados, y en la página del partido las bajas y el pronóstico.
Nunca se inventa un marcador: sin datos, queda el snapshot.

**Para activarlo:**
1. Crear una cuenta en api-football.com (plan gratuito: 100 pedidos/día) y copiar la clave.
2. Local: `.env.local` con `API_FOOTBALL_KEY=...` y correr `npm run sync` para probar.
3. GitHub: `gh secret set API_FOOTBALL_KEY` en el repo. El cron arranca solo; también se puede
   disparar a mano desde Actions ("Run workflow").

Presupuesto: cada corrida usa ~3 pedidos de fixtures + 2 por partido con detalles. Con el cron cada 2 h
y `--details 6` son ~180/día en el peor caso: el script corta al llegar a `--max-requests` (20 por defecto,
o sea ≤ 240/día teóricos pero en la práctica ~60-100 porque los detalles frescos no se vuelven a pedir).
Con plan pago (7.500/día) se puede bajar el cron a cada 5 minutos para marcador casi en vivo.

## Scripts

| Script | Qué hace |
|---|---|
| `scripts/fetch-crests.mjs` | Baja escudos y logos de torneos (TheSportsDB) y los normaliza |
| `scripts/build-snapshot.mjs` | Une equipos + partidos, valida y escribe `data/snapshot.json` |
| `scripts/og.mjs` | Genera `public/og.png` (1200×630) e íconos |
| `scripts/vasco-photo.mjs` | Recorta y escala la foto del Vasco para la intro |
| `scripts/deploy.mjs` | Publica `out/` en la rama `gh-pages` |
