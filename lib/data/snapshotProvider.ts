import type { AgendaProvider } from "./provider";
import type { AgendaSnapshot, Match, SnapshotMeta } from "@/lib/types";
import { toLocalDate } from "@/lib/time";
import snapshot from "@/data/snapshot.json";

const data = snapshot as unknown as AgendaSnapshot;

/** Proveedor de la fase 1: snapshot verificado a mano, embebido en el build. */
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
