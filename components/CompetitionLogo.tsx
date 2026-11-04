import { asset } from "@/lib/site";
import type { Competition } from "@/lib/types";

interface Props {
  competition: Competition;
  size?: number;
  className?: string;
}

export function CompetitionLogo({ competition, size = 28, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(competition.logo)}
      alt={competition.name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`object-contain select-none ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
