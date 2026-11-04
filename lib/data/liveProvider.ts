import type { AgendaProvider } from "./provider";
import type { AgendaSnapshot, Match, SnapshotMeta } from "@/lib/types";

/**
 * FASE 2 — esqueleto, deliberadamente NO cableado.
 *
 * Diseño previsto:
 *  1. `fetchFixtures(date)` → GET a la API deportiva (HTTP, con API key en
 *     variable de entorno del servidor o un proxy mínimo en Edge para no
 *     exponerla al cliente).
 *  2. Normalización → `Match[]` del dominio (misma forma que el snapshot),
 *     mapeando ids externos a nuestros slugs via `data/teamAliases.json`.
 *  3. Caché en dos niveles:
 *     - memoria del módulo (por fecha) con TTL,
 *     - localStorage `vasco:fixtures:<fecha>` con `fetchedAtUtc`.
 *  4. Polling en el cliente con `setInterval` adaptativo
 *     (30-60 s con partidos `live`, 10-15 min si no hay ninguno) y pausa con
 *     `document.visibilityState === "hidden"`.
 *  5. Fallback: si la API falla, se sirve el último caché y se muestra
 *     "última actualización hace X min". Nunca se inventa un marcador.
 *
 * Mientras no exista una API configurada, este proveedor lanza para que nadie
 * lo use por accidente.
 */
export class LiveProvider implements AgendaProvider {
  readonly kind = "live";

  constructor(private readonly endpoint?: string) {}

  private notReady(): never {
    throw new Error(
      `LiveProvider no está habilitado (endpoint=${this.endpoint ?? "sin configurar"}). ` +
        "Es parte de la fase 2.",
    );
  }

  async getSnapshot(): Promise<AgendaSnapshot> {
    return this.notReady();
  }
  async getMeta(): Promise<SnapshotMeta> {
    return this.notReady();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMatches(_from: string, _to: string): Promise<Match[]> {
    return this.notReady();
  }
}
