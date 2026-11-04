import { SITE } from "./site";

const TZ = SITE.timeZone;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("es-UY", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const longDayFmt = new Intl.DateTimeFormat("es-UY", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

const shortDayFmt = new Intl.DateTimeFormat("es-UY", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const stampFmt = new Intl.DateTimeFormat("es-UY", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** YYYY-MM-DD en Montevideo para un instante dado. */
export function toLocalDate(iso: string | Date): string {
  return dateFmt.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** HH:mm en Montevideo. */
export function toLocalTime(iso: string | Date): string {
  return timeFmt.format(typeof iso === "string" ? new Date(iso) : iso).replace(/^24:/, "00:");
}

/** "miércoles 4 de noviembre" */
export function formatLongDay(ymd: string): string {
  return capitalize(longDayFmt.format(ymdToNoonUtc(ymd)));
}

/** "mié 4 nov" */
export function formatShortDay(ymd: string): string {
  return shortDayFmt.format(ymdToNoonUtc(ymd)).replace(/\./g, "");
}

/** "4 nov, 14:32" */
export function formatStamp(iso: string): string {
  return stampFmt.format(new Date(iso)).replace(/\./g, "");
}

/** Fecha de hoy (YYYY-MM-DD) en Montevideo. */
export function todayLocal(now: Date = new Date()): string {
  return toLocalDate(now);
}

/** Suma días a una fecha YYYY-MM-DD (aritmética de calendario, sin TZ). */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

function ymdToNoonUtc(ymd: string): Date {
  // Mediodía UTC cae siempre dentro del mismo día en Montevideo (UTC-3).
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
