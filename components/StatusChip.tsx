import type { DisplayStatus } from "@/lib/status";

const styles: Record<DisplayStatus["kind"], string> = {
  scheduled: "bg-white/6 text-fg-2 border-line",
  live: "bg-rose/15 text-rose border-rose/40",
  "in-progress": "bg-amber/12 text-amber border-amber/30",
  "ended-pending": "bg-white/6 text-muted border-line",
  finished: "bg-neon/12 text-neon border-neon/30",
  postponed: "bg-rose/12 text-rose border-rose/30",
  unknown: "bg-white/6 text-muted border-line",
};

export function StatusChip({ status, className = "" }: { status: DisplayStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${styles[status.kind]} ${className}`}
    >
      {(status.kind === "in-progress" || status.kind === "live") && (
        <span className={`h-1.5 w-1.5 rounded-full ${status.kind === "live" ? "bg-rose" : "bg-amber"}`} style={{ animation: "pulse-neon 1.6s infinite" }} />
      )}
      {status.kind === "finished" ? "Final" : status.label}
    </span>
  );
}
