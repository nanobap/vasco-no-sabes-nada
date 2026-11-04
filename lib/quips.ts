import type { MatchView } from "./types";
import type { GestureName } from "@/components/vasco3d/scene";
import { hash } from "./probability";
import { isFinished } from "./agenda";

export interface Quip {
  text: string;
  gesture: GestureName;
}

/** Frases del Vasco para un partido: deterministas por id, con los nombres reales. */
export function quipsFor(m: MatchView): Quip[] {
  const H = m.home.shortName;
  const A = m.away.shortName;
  const comp = m.competition.shortName;
  const seed = hash(m.id);

  const pool: Quip[] = [
    { text: `${H} contra ${A}. Yo pensé que ${A} era una marca de yerba.`, gesture: "think" },
    { text: `¿${comp}? ¿Eso se juega con pelota o con cartas?`, gesture: "shrug" },
    { text: `Para mí gana ${H}. O ${A}. Uno de los dos, seguro.`, gesture: "nod" },
    { text: `A las ${m.localTime} tengo asado, así que lo veo por el grupo.`, gesture: "point" },
    { text: `${A} de visitante es otro equipo. Más feo, pero otro.`, gesture: "shake" },
    { text: `Si empatan me lo tomo como una victoria personal.`, gesture: "cheer" },
    { text: `¿Esto es ida y vuelta? ¿O vuelta y ida?`, gesture: "think" },
    { text: `Yo a ${H} lo sigo desde que... bueno, desde hoy.`, gesture: "shrug" },
    { text: `Partido para ver con la tele de fondo y el celular de frente.`, gesture: "nod" },
    { text: `${m.venue ? `¿${m.venue.split(" · ")[0]}? Ahí fui una vez. O era otro.` : "¿Dónde se juega? Da igual, no voy."}`, gesture: "think" },
  ];

  const special: Quip[] = [];
  if (m.competition.id === "copa-auf") {
    special.push({ text: "Copa AUF: donde los grandes van a pasar vergüenza al interior.", gesture: "shake" });
  }
  if (m.competition.id === "ucl") {
    special.push({ text: "Fase liga de la Champions. Antes eran grupos y yo tampoco entendía.", gesture: "shrug" });
  }
  if (/nacional|penarol/.test(m.home.id + m.away.id)) {
    special.push({ text: "Juega un grande. Ya me están llegando audios y no empezó.", gesture: "cheer" });
  }
  if (isFinished(m)) {
    const winner = (m.homeScore ?? 0) > (m.awayScore ?? 0) ? H : (m.awayScore ?? 0) > (m.homeScore ?? 0) ? A : null;
    special.push(
      winner
        ? { text: `${m.homeScore}-${m.awayScore}. Yo había dicho ${winner}. Nadie me cree, pero lo dije.`, gesture: "cheer" }
        : { text: `Empate. Lo mío fue decir "esto termina parejo", lo juro.`, gesture: "nod" },
    );
  }

  // Mezcla determinista: 2 especiales (si hay) + 3 del pool
  const picked: Quip[] = [...special.slice(0, 2)];
  const idx = [seed % pool.length, (seed >> 3) % pool.length, (seed >> 7) % pool.length];
  for (const i of idx) if (!picked.includes(pool[i])) picked.push(pool[i]);
  return picked.slice(0, 5);
}
