import { FhirBundle, FhirResource } from "@/types/fhir";

export interface TimelineEvent {
  date: string;
  type: string;
  description: string;
  source: string;
}

export function extractTimelineEvents(
  bundle: FhirBundle,
  sourceName: string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const entry of bundle.entry || []) {
    const event = extractEvent(entry.resource, sourceName);
    if (event) events.push(event);
  }

  return events;
}

function extractEvent(r: FhirResource, source: string): TimelineEvent | null {
  const date = getDate(r);
  if (!date) return null;

  const display = (r.code as any)?.coding?.[0]?.display
    || (r.medicationCodeableConcept as any)?.coding?.[0]?.display
    || (r.type as any)?.[0]?.coding?.[0]?.display
    || r.resourceType;

  return { date, type: r.resourceType, description: display, source };
}

function getDate(r: FhirResource): string | null {
  return (
    (r.onsetDateTime as string) ||
    (r.recordedDate as string) ||
    (r.authoredOn as string) ||
    (r.effectiveDateTime as string) ||
    (r.performedDateTime as string) ||
    (r.period as any)?.start ||
    null
  );
}

export function sortEventsByDate(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
