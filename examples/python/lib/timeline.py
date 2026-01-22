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
    for path in [
        ("code", "coding", 0, "display"),
        ("medicationCodeableConcept", "coding", 0, "display"),
        ("type", 0, "coding", 0, "display"),
    ]:
        value = resource
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            elif isinstance(value, list) and isinstance(key, int) and len(value) > key:
                value = value[key]
            else:
                value = None
                break
        if value:
            return value
    return resource.get("resourceType", "Unknown")


def _get_resource_date(resource: dict[str, Any]) -> str | None:
    """Extract the most relevant date from a FHIR resource."""
    for field in [
        "onsetDateTime",
        "recordedDate",
        "authoredOn",
        "effectiveDateTime",
        "performedDateTime",
    ]:
        if resource.get(field):
            return resource[field]
    # Check nested period.start
    period = resource.get("period")
    if period and period.get("start"):
        return period["start"]
    return None
