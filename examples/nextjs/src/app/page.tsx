import { loadAllBundles } from "@/lib/fhir-loader";
import { extractTimelineEvents, sortEventsByDate } from "@/lib/timeline";
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
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400" /> Hospital
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-200 border border-green-400" /> Clinic
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-200 border border-purple-400" /> Lab
        </span>
      </div>

      <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
        This timeline combines events without reconciliation. Your task is to
        detect and resolve duplicates and conflicts.
      </div>

      <Timeline events={allEvents} />
    </main>
  );
}
