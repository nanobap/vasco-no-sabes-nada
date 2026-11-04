/**
 * Modelo de dominio de la agenda.
 *
 * Todo horario se guarda en UTC (ISO 8601) y se formatea en America/Montevideo
 * al renderizar. Nunca se guardan horas "locales" sueltas.
 */

export type MatchStatus =
  | "scheduled" // programado, todavía no empezó
  | "live" // en juego — reservado para la fase 2 (no se usa con snapshot)
  | "finished" // terminado, con marcador verificado
  | "postponed" // suspendido / postergado
  | "unknown"; // sin información confiable del resultado

export interface Team {
  id: string; // slug estable, p. ej. "penarol"
  name: string; // nombre completo como se dice en Uruguay
  shortName: string; // para pantallas chicas
  country: string; // ISO-3
  crest: string; // ruta local en /public/crests/*.png
  /** Color representativo del escudo (hex), calculado en el build. */
  color?: string;
}

export interface Competition {
  id: string; // slug estable, p. ej. "ucl"
  name: string;
  shortName: string;
  region: "uruguay" | "sudamerica" | "europa" | "mundo";
  logo: string; // ruta local en /public/competitions/*.png
  priority: number; // orden de aparición (menor = más arriba)
  accent: string; // color de acento del torneo (hex)
}

export interface Match {
  id: string;
  competitionId: string;
  round?: string;
  kickoffUtc: string; // ISO 8601 en UTC
  homeId: string;
  awayId: string;
  venue?: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  /** Marca editorial: partido destacado del día. */
  featured?: boolean;
  /** Texto corto editorial de por qué es el partidazo. */
  featuredBlurb?: string;
  /** Fuente desde la que se verificó este partido. */
  sourceUrl?: string;
}

export interface SnapshotMeta {
  /** Cuándo se verificó la agenda (ISO UTC). */
  verifiedAtUtc: string;
  /** Rango de fechas (en Montevideo) que cubre el snapshot. */
  coversFrom: string; // YYYY-MM-DD
  coversTo: string; // YYYY-MM-DD
  /** Fuentes consultadas. */
  sources: string[];
  /** Notas editoriales (torneos sin actividad, etc.). */
  notes?: string[];
}

export interface AgendaSnapshot {
  meta: SnapshotMeta;
  teams: Team[];
  competitions: Competition[];
  matches: Match[];
}

/** Partido ya resuelto con sus entidades, listo para la UI. */
export interface MatchView extends Match {
  competition: Competition;
  home: Team;
  away: Team;
  /** Fecha YYYY-MM-DD en America/Montevideo. */
  localDate: string;
  /** Hora HH:mm en America/Montevideo. */
  localTime: string;
}
