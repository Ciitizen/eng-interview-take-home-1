import { TimelineEvent } from "@/lib/timeline";

const SOURCE_COLORS: Record<string, string> = {
  "Metro General Hospital": "bg-blue-100 border-blue-400",
  "CityCare Primary Clinic": "bg-green-100 border-green-400",
  "HealthFirst Laboratories": "bg-purple-100 border-purple-400",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="relative pl-10">
            <div className="absolute left-2.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />
            <div className={`p-3 rounded border ${SOURCE_COLORS[event.source] || "bg-gray-100"}`}>
              <div className="flex justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{event.type}</div>
                  <div>{event.description}</div>
                </div>
                <div className="text-right text-sm text-gray-600 whitespace-nowrap">
                  <div>{new Date(event.date).toLocaleDateString()}</div>
                  <div className="text-xs">{event.source}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
