import { getProvider } from "@/lib/data";
import { Crest } from "@/components/Crest";
import { CompetitionLogo } from "@/components/CompetitionLogo";

export const metadata = { title: "Escudos", robots: { index: false } };

/** Hoja de control: todos los escudos del snapshot, para verificar que cada uno es el correcto. */
export default async function Page() {
  const s = await getProvider().getSnapshot();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Escudos ({s.teams.length})</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        {s.competitions.map((c) => (
          <div key={c.id} className="card flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
            <CompetitionLogo competition={c} size={28} /> {c.name}
          </div>
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
        {s.teams.map((t) => (
          <li key={t.id} className="card flex flex-col items-center gap-2 rounded-xl p-3 text-center">
            <Crest team={t} size={56} />
            <span className="text-[11px] leading-tight">{t.name}</span>
            <span className="text-[9px] text-muted">{t.country}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
