"""Extract timeline events from FHIR bundles."""

from dataclasses import dataclass
from typing import Any


@dataclass
class TimelineEvent:
    date: str
    type: str
    description: str
    source: str


def extract_timeline_events(bundle: dict[str, Any], source_name: str) -> list[TimelineEvent]:
    """Extract timeline events from a FHIR Bundle."""
    events = []
    for entry in bundle.get("entry", []):
        resource = entry.get("resource")
        if not resource:
            continue
        event = _resource_to_event(resource, source_name)
        if event:
            events.append(event)
    return events


def sort_events_by_date(events: list[TimelineEvent]) -> list[TimelineEvent]:
    """Sort events chronologically."""
    return sorted(events, key=lambda e: e.date)


def _resource_to_event(resource: dict[str, Any], source: str) -> TimelineEvent | None:
    """Convert a FHIR resource to a timeline event."""
    date = _get_resource_date(resource)
    if not date:
        return None
    return TimelineEvent(
        date=date,
        type=resource.get("resourceType", "Unknown"),
        description=_get_resource_display(resource),
        source=source,
    )


def _get_resource_display(resource: dict[str, Any]) -> str:
    """Extract display text from a FHIR resource."""
    # Try common FHIR patterns for display text
    if code := resource.get("code"):
        if coding := code.get("coding"):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    if med := resource.get("medicationCodeableConcept"):
        if coding := med.get("coding"):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    if types := resource.get("type"):
        if types and (coding := types[0].get("coding")):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    return resource.get("resourceType", "Unknown")


def _get_resource_date(resource: dict[str, Any]) -> str | None:
    """Extract the most relevant date from a FHIR resource."""
    for field in ["onsetDateTime", "recordedDate", "authoredOn", "effectiveDateTime", "performedDateTime"]:
        if resource.get(field):
            return resource[field]
    if period := resource.get("period"):
        return period.get("start")
    return None
