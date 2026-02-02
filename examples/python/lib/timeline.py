"""Extract timeline events from FHIR bundles."""

from dataclasses import dataclass, field
from typing import Any

from fhir.resources.R4B.bundle import Bundle
from fhir.resources.R4B.resource import Resource

STANDARDIZED_SYSTEMS = {
    "http://snomed.info/sct",
    "http://loinc.org",
    "http://www.nlm.nih.gov/research/umls/rxnorm",
}


@dataclass
class TimelineEvent:
    date: str
    type: str
    description: str
    source: str
    code: str | None = None
    code_system: str | None = None
    # Condition-specific
    clinical_status: str | None = None
    verification_status: str | None = None
    # Medication-specific
    dosage: str | None = None
    # Observation-specific
    value: str | None = None
    # Allergy-specific
    criticality: str | None = None
    reaction: str | None = None


@dataclass
class ConflictedEvent:
    code: str
    code_system: str
    description: str
    type: str
    events: list[TimelineEvent] = field(default_factory=list)
    conflict_types: list[str] = field(default_factory=list)


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
    code, code_system = _get_code(data)
    resource_type = data.get("resourceType", "Unknown")

    event = TimelineEvent(
        date=date,
        type=resource_type,
        description=_get_display(data),
        source=source,
        code=code,
        code_system=code_system,
    )

    if resource_type == "Condition":
        event.clinical_status = _get_status_code(data, "clinicalStatus")
        event.verification_status = _get_status_code(data, "verificationStatus")
    elif resource_type == "MedicationRequest":
        event.dosage = _get_dosage(data)
    elif resource_type == "Observation":
        event.value = _get_observation_value(data)
    elif resource_type == "AllergyIntolerance":
        event.criticality = data.get("criticality")
        event.reaction = _get_reaction_summary(data)

    return event


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


def _get_code(data: dict[str, Any]) -> tuple[str | None, str | None]:
    """Extract the standardized code (SNOMED/LOINC/RxNorm) from a FHIR resource dict."""
    for codeable_field in ["code", "medicationCodeableConcept"]:
        if concept := data.get(codeable_field):
            if codings := concept.get("coding"):
                for coding in codings:
                    system = coding.get("system", "")
                    if system in STANDARDIZED_SYSTEMS and coding.get("code"):
                        return coding["code"], system
    return None, None


def _get_status_code(data: dict[str, Any], field_name: str) -> str | None:
    """Extract the code from a status CodeableConcept (clinicalStatus, verificationStatus)."""
    if status := data.get(field_name):
        if codings := status.get("coding"):
            if codings and codings[0].get("code"):
                return codings[0]["code"]
    return None


def _get_dosage(data: dict[str, Any]) -> str | None:
    """Extract dosage string from dosageInstruction[0].doseAndRate[0].doseQuantity."""
    instructions = data.get("dosageInstruction")
    if not instructions:
        return None
    dose_and_rate = instructions[0].get("doseAndRate")
    if not dose_and_rate:
        return None
    dose_qty = dose_and_rate[0].get("doseQuantity")
    if not dose_qty:
        return None
    value = dose_qty.get("value")
    unit = dose_qty.get("unit", "")
    if value is not None:
        return f"{value} {unit}".strip()
    return None


def _get_observation_value(data: dict[str, Any]) -> str | None:
    """Extract value + unit from valueQuantity."""
    if vq := data.get("valueQuantity"):
        value = vq.get("value")
        unit = vq.get("unit", "")
        if value is not None:
            return f"{value} {unit}".strip()
    return None


def _get_reaction_summary(data: dict[str, Any]) -> str | None:
    """Summarize allergy reactions as 'manifestation (severity); ...'."""
    reactions = data.get("reaction")
    if not reactions:
        return None
    parts = []
    for r in reactions:
        manifestation_text = ""
        if manifestations := r.get("manifestation"):
            if manifestations and (coding := manifestations[0].get("coding")):
                if coding and coding[0].get("display"):
                    manifestation_text = coding[0]["display"]
        severity = r.get("severity", "unknown")
        if manifestation_text:
            parts.append(f"{manifestation_text} ({severity})")
        else:
            parts.append(severity)
    return "; ".join(parts) if parts else None
