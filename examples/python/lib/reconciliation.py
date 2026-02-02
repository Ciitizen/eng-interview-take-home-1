"""Detect conflicts across FHIR data from multiple sources."""

from collections import defaultdict
from datetime import date, timedelta

from .timeline import ConflictedEvent, TimelineEvent

_MAX_MED_GAP = timedelta(days=30)


def reconcile_events(
    events: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Group events by standardized code, detect conflicts, and return a merged list.

    Events without a standardized code are passed through unchanged.
    Events that share a code across multiple sources are checked for
    category-specific conflicts.
    """
    groups: dict[tuple[str, str], list[TimelineEvent]] = defaultdict(list)
    ungrouped: list[TimelineEvent] = []

    for event in events:
        if event.code and event.code_system:
            groups[(event.code, event.code_system)].append(event)
        else:
            ungrouped.append(event)

    result: list[TimelineEvent | ConflictedEvent] = []

    for (code, code_system), group in groups.items():
        sources_present = {e.source for e in group}
        resource_type = group[0].type

        if len(sources_present) < 2:
            result.extend(group)
            continue

        result.extend(_reconcile_group(code, code_system, resource_type, group))

    result.extend(ungrouped)
    return sorted(result, key=_sort_key)


def _reconcile_group(
    code: str,
    code_system: str,
    resource_type: str,
    group: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Dispatch to category-specific reconciliation that may split the group."""
    if resource_type == "Condition":
        return _reconcile_conditions(code, code_system, group)
    if resource_type == "MedicationRequest":
        return _reconcile_medications(code, code_system, group)
    if resource_type == "Observation":
        return _reconcile_observations(code, code_system, group)
    if resource_type == "AllergyIntolerance":
        return _reconcile_allergies(code, code_system, group)
    return list(group)


def _sort_key(item: TimelineEvent | ConflictedEvent) -> str:
    """Return a normalized YYYY-MM-DD date for chronological sorting."""
    if isinstance(item, ConflictedEvent):
        return min(e.date[:10] for e in item.events)
    return item.date[:10]


# ── Conditions ──────────────────────────────────────────────────────────────

def _reconcile_conditions(
    code: str, code_system: str, group: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Flag if onset dates, clinical_status, or verification_status differs across sources."""
    conflicts: list[str] = []

    dates = {e.date[:10] for e in group}
    if len(dates) > 1:
        conflicts.append("date_mismatch")

    statuses = {e.clinical_status for e in group if e.clinical_status}
    if len(statuses) > 1:
        conflicts.append("status_mismatch")

    ver_statuses = {e.verification_status for e in group if e.verification_status}
    if len(ver_statuses) > 1:
        conflicts.append("verification_mismatch")

    if not conflicts:
        return list(group)

    earliest = min(group, key=lambda e: e.date)
    return [ConflictedEvent(
        code=code,
        code_system=code_system,
        description=earliest.description,
        type="Condition",
        events=sorted(group, key=lambda e: e.date),
        conflict_types=conflicts,
    )]


# ── Medications ─────────────────────────────────────────────────────────────

def _reconcile_medications(
    code: str, code_system: str, group: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Flag only if same drug has different doses within 30 days.

    Events far apart in time represent legitimate dose adjustments and are
    kept as separate timeline entries.
    """
    sorted_events = sorted(group, key=lambda e: e.date[:10])

    # Build clusters of events within 30 days of each other
    clusters: list[list[TimelineEvent]] = []
    for ev in sorted_events:
        ev_date = _parse_date(ev.date)
        placed = False
        for cluster in clusters:
            cluster_date = _parse_date(cluster[-1].date)
            if abs((ev_date - cluster_date).days) <= _MAX_MED_GAP.days:
                cluster.append(ev)
                placed = True
                break
        if not placed:
            clusters.append([ev])

    results: list[TimelineEvent | ConflictedEvent] = []
    for cluster in clusters:
        sources = {e.source for e in cluster}
        dosages = {e.dosage for e in cluster if e.dosage}
        if len(sources) >= 2 and len(dosages) > 1:
            earliest = min(cluster, key=lambda e: e.date)
            results.append(ConflictedEvent(
                code=code,
                code_system=code_system,
                description=earliest.description,
                type="MedicationRequest",
                events=sorted(cluster, key=lambda e: e.date),
                conflict_types=["dosage_mismatch"],
            ))
        else:
            results.extend(cluster)
    return results


# ── Observations ────────────────────────────────────────────────────────────

def _reconcile_observations(
    code: str, code_system: str, group: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Flag only if same test on same date has different values.

    Different dates are separate legitimate tests — returned as individual events.
    """
    by_date: dict[str, list[TimelineEvent]] = defaultdict(list)
    for e in group:
        by_date[e.date[:10]].append(e)

    results: list[TimelineEvent | ConflictedEvent] = []
    for _day, day_events in by_date.items():
        sources = {e.source for e in day_events}
        values = {e.value for e in day_events if e.value}
        if len(sources) >= 2 and len(values) > 1:
            earliest = min(day_events, key=lambda e: e.date)
            results.append(ConflictedEvent(
                code=code,
                code_system=code_system,
                description=earliest.description,
                type="Observation",
                events=sorted(day_events, key=lambda e: e.date),
                conflict_types=["value_mismatch"],
            ))
        else:
            results.extend(day_events)
    return results


# ── Allergies ───────────────────────────────────────────────────────────────

def _reconcile_allergies(
    code: str, code_system: str, group: list[TimelineEvent],
) -> list[TimelineEvent | ConflictedEvent]:
    """Flag if criticality or reaction details differ."""
    conflicts: list[str] = []

    criticalities = {e.criticality for e in group if e.criticality}
    if len(criticalities) > 1:
        conflicts.append("criticality_mismatch")

    reactions = {e.reaction for e in group if e.reaction}
    if len(reactions) > 1:
        conflicts.append("reaction_mismatch")

    if not conflicts:
        return list(group)

    earliest = min(group, key=lambda e: e.date)
    return [ConflictedEvent(
        code=code,
        code_system=code_system,
        description=earliest.description,
        type="AllergyIntolerance",
        events=sorted(group, key=lambda e: e.date),
        conflict_types=conflicts,
    )]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _parse_date(date_str: str) -> date:
    """Parse a YYYY-MM-DD prefix into a date object."""
    return date.fromisoformat(date_str[:10])
