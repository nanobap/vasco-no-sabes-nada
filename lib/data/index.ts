import type { AgendaProvider } from "./provider";
import { SnapshotProvider } from "./snapshotProvider";
import { LiveProvider } from "./liveProvider";

/**
 * Punto único de acceso a datos. La UI nunca importa un proveedor concreto.
 * `NEXT_PUBLIC_DATA_SOURCE=live` queda reservado para la fase 2.
 */
export function getProvider(): AgendaProvider {
  const source = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "snapshot";
  if (source === "live") {
    return new LiveProvider(process.env.NEXT_PUBLIC_LIVE_ENDPOINT);
  }
  return new SnapshotProvider();
}

export type { AgendaProvider } from "./provider";
