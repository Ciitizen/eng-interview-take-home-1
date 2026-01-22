import { TimelineEvent } from "@/lib/timeline";
import { getSourceColors } from "@/lib/constants";

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300" />
      <div className="space-y-3">
        {events.map((event, i) => {
          const colors = getSourceColors(event.source);
          return (
            <div key={i} className="relative pl-10">
              <div className="absolute left-2.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />
              <div className={`p-3 rounded border ${colors.bg} ${colors.border}`}>
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
          );
        })}
      </div>
    </div>
  );
}
