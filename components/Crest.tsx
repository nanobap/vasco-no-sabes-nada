import { asset } from "@/lib/site";
import type { Team } from "@/lib/types";

interface Props {
  team: Team;
  size?: number;
  className?: string;
  priority?: boolean;
}

/** Escudo real del club. Siempre imagen; nunca iniciales ni placeholders. */
export function Crest({ team, size = 48, className = "", priority = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(team.crest)}
      alt={`Escudo de ${team.name}`}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`crest object-contain select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
