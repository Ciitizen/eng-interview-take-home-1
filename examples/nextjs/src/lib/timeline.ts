import { Bundle, Resource } from "@/types/fhir";

export interface TimelineEvent {
  date: string;
  type: string;
  description: string;
  source: string;
}

export function extractTimelineEvents(
  bundle: Bundle,
  sourceName: string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const entry of bundle.entry || []) {
    if (!entry.resource) continue;
    const event = extractEvent(entry.resource, sourceName);
    if (event) events.push(event);
  }

  return events;
}

function extractEvent(r: Resource, source: string): TimelineEvent | null {
  const date = getDate(r);
  if (!date) return null;

  // Cast to any for generic property access across resource types
  const resource = r as any;
  const display =
    resource.code?.coding?.[0]?.display ||
    resource.medicationCodeableConcept?.coding?.[0]?.display ||
    resource.type?.[0]?.coding?.[0]?.display ||
    r.resourceType;

  return { date, type: r.resourceType, description: display, source };
}

function getDate(r: Resource): string | null {
  // Cast to any for generic property access across resource types
  const resource = r as any;
  return (
    resource.onsetDateTime ||
    resource.recordedDate ||
    resource.authoredOn ||
    resource.effectiveDateTime ||
    resource.performedDateTime ||
    resource.period?.start ||
    null
  );
}

export function sortEventsByDate(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
