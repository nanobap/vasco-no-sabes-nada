"use client";

import type { MatchView } from "@/lib/types";
import { SITE } from "@/lib/site";
import { whatsappUrl } from "@/lib/share";
import { formatLongDay } from "@/lib/time";
import { isFinished } from "@/lib/agenda";

export function MatchShare({ match: m }: { match: MatchView }) {
  const url = `${SITE.url}partido/${m.id}/`;
  const text = isFinished(m)
    ? `⚽ *${m.home.name} ${m.homeScore}-${m.awayScore} ${m.away.name}* (final)\n${m.competition.name} · ${m.round}\n👉 ${url}`
    : `⚽ *${m.home.name} vs ${m.away.name}*\n${formatLongDay(m.localDate)} · ${m.localTime} (hora UY)\n${m.competition.name} · ${m.round}${m.venue ? `\n📍 ${m.venue}` : ""}\n👉 ${url}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelado */
      }
    }
    window.open(whatsappUrl(text), "_blank", "noopener");
  };

  return (
    <button
      type="button"
      onClick={share}
      className="chip font-display inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neon px-5 py-3.5 text-xs font-black uppercase tracking-widest text-ink shadow-[0_12px_30px_-12px_rgba(77,255,154,0.9)]"
    >
      Mandar este partido al grupo
    </button>
  );
}

export default MatchShare;
