import { SITE } from "@/lib/site";
import { formatStamp } from "@/lib/time";

export function Header({ count, verifiedAtUtc, syncedAtUtc }: { count: number; verifiedAtUtc: string; syncedAtUtc?: string | null }) {
  return (
    <header className="relative pb-5 pt-7 sm:pt-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.35em] text-neon">
            Agenda diaria de fútbol · UY
          </p>
          <h1 className="font-display mt-2 text-[32px] font-black leading-[1.08] tracking-tight sm:text-5xl">
            <span className="block text-fg">VASCO,</span>
            <span className="block text-fg-2">NO SABÉS</span>
            <span className="text-glow block text-neon">NADA.</span>
          </h1>
          <p className="mt-3 max-w-xs text-[14px] leading-snug text-fg-2 sm:max-w-sm sm:text-[15px]">
            {SITE.tagline}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="card flex flex-col items-center rounded-2xl px-4 py-3">
            <span className="font-display text-glow text-3xl font-black leading-none tabular-nums text-neon">
              {count}
            </span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              {count === 1 ? "partido" : "partidos"}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-line bg-white/3 px-3 py-1.5 text-[11px] text-fg-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon" />
        Agenda verificada el {formatStamp(verifiedAtUtc)} (hora UY)
        {syncedAtUtc ? (
          <span className="text-muted">· resultados sincronizados {formatStamp(syncedAtUtc)}</span>
        ) : (
          <span className="text-muted">· sin marcadores en vivo</span>
        )}
      </p>
    </header>
  );
}
