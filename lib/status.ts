import type { MatchView } from "./types";

export type DisplayStatus =
  | { kind: "scheduled"; label: string }
  | { kind: "in-progress"; label: string; note: string }
  | { kind: "ended-pending"; label: string; note: string }
  | { kind: "finished"; label: string }
  | { kind: "postponed"; label: string }
  | { kind: "unknown"; label: string };

const MATCH_LENGTH_MS = 115 * 60 * 1000;

/**
 * Estado a mostrar. El snapshot nunca afirma "en vivo": si por horario el
 * partido ya debería haber empezado, se dice explícitamente que no hay
 * marcador en vivo (eso llega en la fase 2).
 */
export function displayStatus(m: MatchView, now: number | null): DisplayStatus {
  if (m.status === "finished") return { kind: "finished", label: "Final" };
  if (m.status === "postponed") return { kind: "postponed", label: "Postergado" };
  if (m.status === "unknown") return { kind: "unknown", label: "Sin datos" };
  if (now == null) return { kind: "scheduled", label: m.localTime };

  const ko = Date.parse(m.kickoffUtc);
  if (now < ko) return { kind: "scheduled", label: m.localTime };
  if (now < ko + MATCH_LENGTH_MS) {
    return { kind: "in-progress", label: "En curso", note: "sin marcador en vivo todavía" };
  }
  return { kind: "ended-pending", label: "Terminó", note: "resultado pendiente de carga" };
}
