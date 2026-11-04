import type { AgendaSnapshot, Match, SnapshotMeta } from "@/lib/types";

/**
 * Contrato de proveedor de datos.
 *
 * FASE 1 (actual): `SnapshotProvider` lee un JSON verificado a mano, embebido
 * en el build. No hay backend.
 *
 * FASE 2 (preparada, NO implementada): un `LiveProvider` que consulta una API
 * deportiva por HTTP (p. ej. API-Football, football-data.org, Sofascore no
 * oficial), con polling en el cliente y caché con TTL. La UI consume solo este
 * contrato, así que cambiar de proveedor no toca componentes.
 *
 * Reglas para la fase 2:
 *  - Solo solicitudes HTTP y lógica convencional. Nada de modelos de IA para
 *    "adivinar" resultados.
 *  - El estado `live` solo puede venir del proveedor en vivo; el snapshot
 *    jamás lo emite.
 *  - Polling adaptativo: 30-60 s si hay partidos en juego, 10-15 min si no.
 *  - Caché: memoria + localStorage con `fetchedAtUtc`; se muestra siempre la
 *    marca de tiempo de la última actualización.
 */
export interface AgendaProvider {
  /** Identificador legible del origen ("snapshot", "api-football", …). */
  readonly kind: string;
  /** Devuelve los partidos cuya fecha local (Montevideo) esté en [from, to]. */
  getMatches(fromYmd: string, toYmd: string): Promise<Match[]>;
  /** Entidades (equipos, torneos) y metadatos de verificación. */
  getSnapshot(): Promise<AgendaSnapshot>;
  getMeta(): Promise<SnapshotMeta>;
}
