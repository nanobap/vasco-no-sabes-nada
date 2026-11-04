import type { AgendaProvider } from "./provider";
import type { AgendaSnapshot, Match, SnapshotMeta } from "@/lib/types";
import { toLocalDate } from "@/lib/time";
import snapshot from "@/data/snapshot.json";
import { applyOverlay } from "./overlay";

// Snapshot verificado a mano + capa de datos reales (API-Football) si el cron la escribió.
const data = applyOverlay(snapshot as unknown as AgendaSnapshot);

/** Snapshot embebido en el build, con superposición de resultados reales cuando existen. */
export class SnapshotProvider implements AgendaProvider {
  readonly kind = "snapshot";

  async getSnapshot(): Promise<AgendaSnapshot> {
    return data;
  }

  async getMeta(): Promise<SnapshotMeta> {
    return data.meta;
  }

  async getMatches(fromYmd: string, toYmd: string): Promise<Match[]> {
    return data.matches.filter((m) => {
      const d = toLocalDate(m.kickoffUtc);
      return d >= fromYmd && d <= toYmd;
    });
  }
}
