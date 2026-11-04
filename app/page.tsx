import { getProvider } from "@/lib/data";
import { buildViews } from "@/lib/agenda";
import { addDays } from "@/lib/time";
import { Agenda } from "@/components/Agenda";

export default async function Page() {
  const provider = getProvider();
  const snapshot = await provider.getSnapshot();
  const views = buildViews(snapshot);
  // "Hoy" por defecto = el día central del snapshot; el cliente lo ajusta a la fecha real.
  const defaultToday = addDays(snapshot.meta.coversFrom, 1);

  return <Agenda matches={views} meta={snapshot.meta} defaultToday={defaultToday} />;
}
