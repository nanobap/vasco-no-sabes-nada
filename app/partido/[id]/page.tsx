import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProvider } from "@/lib/data";
import { buildViews, isFinished } from "@/lib/agenda";
import { formatLongDay } from "@/lib/time";
import { quipsFor } from "@/lib/quips";
import { SITE } from "@/lib/site";
import { MatchHero } from "@/components/MatchHero";
import { ProbabilityCard } from "@/components/ProbabilityCard";
import { VascoBubble } from "@/components/VascoBubble";
import { MatchShare } from "@/components/MatchShare";
import { CompetitionLogo } from "@/components/CompetitionLogo";
import { Crest } from "@/components/Crest";

async function allViews() {
  const snapshot = await getProvider().getSnapshot();
  return { snapshot, views: buildViews(snapshot) };
}

export async function generateStaticParams() {
  const { views } = await allViews();
  return views.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { views } = await allViews();
  const m = views.find((x) => x.id === id);
  if (!m) return {};
  const title = `${m.home.name} vs ${m.away.name}`;
  const description = `${m.competition.name} · ${m.round} · ${formatLongDay(m.localDate)} ${m.localTime} (hora uruguaya)${m.venue ? ` · ${m.venue}` : ""}`;
  return {
    title,
    description,
    openGraph: { title: `${title} · ${SITE.shortName}`, description, url: `${SITE.url}partido/${m.id}/` },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { snapshot, views } = await allViews();
  const m = views.find((x) => x.id === id);
  if (!m) notFound();
  const finished = isFinished(m);
  const quips = quipsFor(m);
  const others = views.filter((x) => x.competition.id === m.competition.id && x.localDate === m.localDate && x.id !== m.id);

  return (
    <main className="relative z-[1] mx-auto w-full max-w-3xl px-4 pb-16">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <Link
          href="/"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-line-2 bg-ink/70 px-3.5 py-1.5 text-xs font-semibold text-fg-2 backdrop-blur hover:text-fg"
        >
          ← Agenda
        </Link>
        <span className="font-display pointer-events-auto rounded-full border border-line-2 bg-ink/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-neon backdrop-blur">
          Vasco, no sabés nada
        </span>
      </div>

      <MatchHero match={m} />

      <div className="relative z-10 -mt-6 space-y-5">
        {/* Ficha */}
        <section className="card rounded-3xl p-5">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-neon">Ficha del partido</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px] sm:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Torneo</dt>
              <dd className="mt-0.5 inline-flex items-center gap-2 font-semibold">
                <CompetitionLogo competition={m.competition} size={18} /> {m.competition.shortName}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Instancia</dt>
              <dd className="mt-0.5 font-semibold">{m.round}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">{finished ? "Resultado" : "Hora (UY)"}</dt>
              <dd className="font-display mt-0.5 text-lg font-bold text-neon">
                {finished ? `${m.homeScore}–${m.awayScore}` : m.localTime}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Día</dt>
              <dd className="mt-0.5 font-semibold">{formatLongDay(m.localDate)}</dd>
            </div>
            {m.venue && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-[11px] uppercase tracking-[0.15em] text-muted">Estadio</dt>
                <dd className="mt-0.5 font-semibold">{m.venue}</dd>
              </div>
            )}
          </dl>
          {m.featuredBlurb && <p className="mt-4 text-[14px] leading-relaxed text-fg-2">{m.featuredBlurb}</p>}
          {!finished && (
            <p className="mt-3 text-[11px] text-muted">
              Esta versión no muestra marcador en vivo. Agenda verificada el {snapshot.meta.verifiedAtUtc.slice(0, 10)}.
            </p>
          )}
        </section>

        <ProbabilityCard match={m} />

        <VascoBubble quips={quips} />

        <MatchShare match={m} />

        {others.length > 0 && (
          <section className="pt-2">
            <h2 className="font-display mb-3 text-sm font-bold uppercase tracking-[0.2em] text-muted">
              Mismo día en {m.competition.shortName}
            </h2>
            <ul className="grid gap-2">
              {others.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/partido/${o.id}/`}
                    className="card card-hover flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px]"
                  >
                    <Crest team={o.home} size={28} />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {o.home.shortName} <span className="text-muted">vs</span> {o.away.shortName}
                    </span>
                    <Crest team={o.away} size={28} />
                    <span className="font-display w-14 text-right tabular-nums text-neon">
                      {isFinished(o) ? `${o.homeScore}–${o.awayScore}` : o.localTime}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
