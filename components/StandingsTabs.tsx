"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StandingTable } from "@/lib/standings";
import type { Team } from "@/lib/types";
import { Crest } from "./Crest";

interface Props {
  tables: StandingTable[];
  teams: Team[];
  /** ids de equipos que juegan en la agenda (para resaltarlos) */
  highlight: string[];
  /** id de partido por equipo, para enlazar */
  matchByTeam: Record<string, string>;
}

export function StandingsTabs({ tables, teams, highlight, matchByTeam }: Props) {
  const groups = useMemo(() => {
    const m = new Map<string, StandingTable[]>();
    for (const t of tables) m.set(t.group, [...(m.get(t.group) ?? []), t]);
    return [...m.entries()];
  }, [tables]);
  const [group, setGroup] = useState(groups[0]?.[0] ?? "");
  const current = groups.find(([g]) => g === group)?.[1] ?? [];
  const [key, setKey] = useState(current[0]?.key ?? "");
  const table = current.find((t) => t.key === key) ?? current[0];
  const teamById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const hl = useMemo(() => new Set(highlight), [highlight]);

  const pick = (g: string) => {
    setGroup(g);
    const first = groups.find(([x]) => x === g)?.[1][0];
    setKey(first?.key ?? "");
  };

  if (!table) return null;
  const cols = table.headers.filter((h, i) => h && i > 1 && h !== "Clasificación" && !/^Clasificaci/.test(h)).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {groups.map(([g]) => (
          <button
            key={g}
            type="button"
            onClick={() => pick(g)}
            aria-pressed={g === group}
            className={`chip shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
              g === group ? "border-neon/60 bg-neon/15 text-neon" : "border-line bg-white/4 text-fg-2 hover:text-fg"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      {current.length > 1 && (
        <div className="grid auto-cols-fr grid-flow-col rounded-2xl border border-line bg-white/4 p-1">
          {current.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setKey(t.key)}
              aria-pressed={t.key === table.key}
              className={`chip rounded-xl px-2 py-2 text-[12px] font-bold ${
                t.key === table.key ? "bg-neon text-ink" : "text-fg-2 hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="card overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-display text-sm font-bold">{table.heading}</h2>
          <span className="text-[11px] text-muted">{table.rows.length} equipos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-muted">
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-1 py-2 text-left font-semibold">Equipo</th>
                {cols.map((c) => (
                  <th key={c} className={`px-2 py-2 text-right font-semibold ${c === "Pts" || c === "PTS" ? "text-neon" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => {
                const team = r.teamId ? teamById.get(r.teamId) : undefined;
                const on = r.teamId ? hl.has(r.teamId) : false;
                const href = r.teamId ? matchByTeam[r.teamId] : undefined;
                const name = (
                  <span className={`inline-flex min-w-0 items-center gap-2 ${on ? "font-bold text-fg" : "text-fg-2"}`}>
                    {team && <Crest team={team} size={20} />}
                    <span className="truncate">{r.team}</span>
                  </span>
                );
                return (
                  <tr key={`${r.team}-${i}`} className={`border-t border-line/60 ${on ? "bg-neon/6" : ""}`}>
                    <td className="px-3 py-2 tabular-nums text-muted">{r.pos ?? i + 1}</td>
                    <td className="max-w-[160px] px-1 py-2">
                      {href ? (
                        <Link href={`/partido/${href}/`} className="hover:underline">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </td>
                    {cols.map((c) => (
                      <td key={c} className={`px-2 py-2 text-right tabular-nums ${c === "Pts" || c === "PTS" ? "font-display font-bold text-fg" : ""}`}>
                        {r.values[c] ?? ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
          Fuente:{" "}
          <a href={table.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sky/80 hover:text-sky">
            Wikipedia
          </a>{" "}
          (CC BY-SA). Los equipos resaltados juegan en la agenda; tocalos para ir al partido.
        </p>
      </div>
    </div>
  );
}

export default StandingsTabs;
