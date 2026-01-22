import { loadAllBundles } from "@/lib/fhir-loader";
import { extractTimelineEvents, sortEventsByDate } from "@/lib/timeline";
import { DATA_SOURCES, COLOR_CLASSES } from "@/lib/constants";
import { Timeline } from "@/components/Timeline";

export default async function Home() {
  const dataSources = await loadAllBundles();
  const allEvents = sortEventsByDate(
    dataSources.flatMap((s) => extractTimelineEvents(s.bundle, s.name))
  );

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Patient Timeline</h1>
      <p className="text-gray-600 mb-4">
        {allEvents.length} events from {dataSources.length} sources
      </p>

      <div className="flex gap-4 mb-6 text-sm">
        {DATA_SOURCES.map((source) => {
          const colors = COLOR_CLASSES[source.color];
          return (
            <span key={source.name} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`} />
              {source.name.split(" ")[0]}
            </span>
          );
        })}
      </div>

      <Timeline events={allEvents} />
    </main>
  );
}
