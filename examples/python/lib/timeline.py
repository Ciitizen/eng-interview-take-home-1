"""Extract timeline events from FHIR bundles."""

from dataclasses import dataclass
from typing import Any

from fhir.resources.R4B.bundle import Bundle
from fhir.resources.R4B.resource import Resource


@dataclass
class TimelineEvent:
    date: str
    type: str
    description: str
    source: str


def extract_timeline_events(bundle: Bundle, source_name: str) -> list[TimelineEvent]:
    """Extract timeline events from a FHIR Bundle."""
    events = []
    for entry in bundle.entry or []:
        if not entry.resource:
            continue
        event = _resource_to_event(entry.resource, source_name)
        if event:
            events.append(event)
    return events


def sort_events_by_date(events: list[TimelineEvent]) -> list[TimelineEvent]:
    """Sort events chronologically."""
    return sorted(events, key=lambda e: e.date)


def _resource_to_event(resource: Resource, source: str) -> TimelineEvent | None:
    """Convert a FHIR resource to a timeline event."""
    data = resource.model_dump()
    date = _get_date(data)
    if not date:
        return None
    return TimelineEvent(
        date=date,
        type=data.get("resourceType", "Unknown"),
        description=_get_display(data),
        source=source,
    )


def _get_display(data: dict[str, Any]) -> str:
    """Extract display text from a FHIR resource dict."""
    if code := data.get("code"):
        if coding := code.get("coding"):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    if med := data.get("medicationCodeableConcept"):
        if coding := med.get("coding"):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    if types := data.get("type"):
        if types and (coding := types[0].get("coding")):
            if coding and coding[0].get("display"):
                return coding[0]["display"]
    return data.get("resourceType", "Unknown")


def _get_date(data: dict[str, Any]) -> str | None:
    """Extract the most relevant date from a FHIR resource dict."""
    for field in ["onsetDateTime", "recordedDate", "authoredOn", "effectiveDateTime", "performedDateTime"]:
        if data.get(field):
            return str(data[field])
    if period := data.get("period"):
        if start := period.get("start"):
            return str(start)
    return None
