/// <reference types="@types/fhir" />

export interface TimelineEvent {
  date: string;
  type: string;
  description: string;
  source: string;
}

/** Extract timeline events from a FHIR Bundle */
export function extractTimelineEvents(
  bundle: fhir4.Bundle,
  sourceName: string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const entry of bundle.entry || []) {
    if (!entry.resource) continue;
    const event = resourceToEvent(entry.resource, sourceName);
    if (event) events.push(event);
  }

  return events;
}

/** Sort events chronologically */
export function sortEventsByDate(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/** Convert a FHIR resource to a timeline event */
function resourceToEvent(
  r: fhir4.Resource,
  source: string
): TimelineEvent | null {
  const date = getResourceDate(r);
  if (!date) return null;

  return {
    date,
    type: r.resourceType,
    description: getResourceDisplay(r),
    source,
  };
}

/** Extract display text from a FHIR resource */
function getResourceDisplay(r: fhir4.Resource): string {
  const resource = r as any;
  return (
    resource.code?.coding?.[0]?.display ||
    resource.medicationCodeableConcept?.coding?.[0]?.display ||
    resource.type?.[0]?.coding?.[0]?.display ||
    r.resourceType
  );
}

/** Extract the most relevant date from a FHIR resource */
function getResourceDate(r: fhir4.Resource): string | null {
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
