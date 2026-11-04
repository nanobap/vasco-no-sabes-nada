import type { Metadata } from "next";
import Link from "next/link";
import { getProvider } from "@/lib/data";
import { buildViews } from "@/lib/agenda";
import { standings } from "@/lib/standings";
import { formatStamp } from "@/lib/time";
import { StandingsTabs } from "@/components/StandingsTabs";

export const metadata: Metadata = {
  title: "Tablas",
  description: "Tabla anual, Clausura, Apertura y descenso del Uruguayo; fase liga de Champions, Europa y Conference; Brasileirão y Liga Argentina.",
};

export default async function Page() {
  const snapshot = await getProvider().getSnapshot();
  const views = buildViews(snapshot);
  const highlight = [...new Set(views.flatMap((m) => [m.home.id, m.away.id]))];
  const matchByTeam: Record<string, string> = {};
  for (const m of views) {
    matchByTeam[m.home.id] ??= m.id;
    matchByTeam[m.away.id] ??= m.id;
  }
  return (
    <main className="relative z-[1] mx-auto w-full max-w-3xl px-4 pb-32 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-fg-2 hover:text-fg"
        >
          ← Agenda
        </Link>
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">Vasco, no sabés nada</span>
      </div>
      <h1 className="font-display text-3xl font-black leading-tight">Tablas</h1>
      <p className="mt-1 text-[13px] text-muted">
        Actualizadas {formatStamp(standings.fetchedAtUtc)} (hora UY) desde Wikipedia. Se refrescan solas con cada sincronización.
      </p>
      <div className="mt-5">
        <StandingsTabs tables={standings.tables} teams={snapshot.teams} highlight={highlight} matchByTeam={matchByTeam} />
      </div>
    </main>
  );
}
