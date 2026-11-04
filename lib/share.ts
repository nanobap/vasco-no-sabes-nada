import type { MatchView } from "./types";
import { SITE } from "./site";
import { formatLongDay } from "./time";
import { groupByCompetition, isFinished } from "./agenda";

/** Texto plano de la cartelera del día, listo para WhatsApp. */
export function buildShareText(ymd: string, matches: MatchView[]): string {
  const lines: string[] = [];
  lines.push(`⚽ *VASCO, NO SABÉS NADA*`);
  lines.push(`_${formatLongDay(ymd)} · hora uruguaya_`);
  lines.push("");

  if (!matches.length) {
    lines.push("Hoy no hay partidos en la agenda. Ni Vasco encontró uno.");
  }

  // WhatsApp tolera textos largos, pero un grupo no: tope de partidos por mensaje.
  const MAX = 28;
  let listed = 0;
  let omitted = 0;
  for (const g of groupByCompetition(matches)) {
    if (listed >= MAX) {
      omitted += g.matches.length;
      continue;
    }
    lines.push(`🏆 *${g.competition.name}*`);
    for (const m of g.matches) {
      if (listed >= MAX) {
        omitted += 1;
        continue;
      }
      const score = isFinished(m) ? ` ${m.homeScore}-${m.awayScore} (final)` : "";
      lines.push(`• ${m.localTime}  ${m.home.name} vs ${m.away.name}${score}`);
      listed += 1;
    }
    lines.push("");
  }
  if (omitted > 0) {
    lines.push(`…y ${omitted} partidos más en la web.`);
    lines.push("");
  }

  lines.push(`👉 ${SITE.url}`);
  return lines.join("\n");
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
