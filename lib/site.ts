export const SITE = {
  name: "VASCO, NO SABÉS NADA",
  shortName: "Vasco, no sabés nada",
  tagline: "El fútbol de hoy, para los que saben (y para Vasco).",
  url: "https://nanobap.github.io/vasco-no-sabes-nada/",
  timeZone: "America/Montevideo",
} as const;

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefija rutas de /public con el basePath (GitHub Pages sirve bajo /<repo>/). */
export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
