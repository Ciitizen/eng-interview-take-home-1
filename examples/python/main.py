"""Patient Timeline - FastAPI application."""

from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from lib.constants import DATA_SOURCES, COLOR_CLASSES, get_source_colors
from lib.fhir_loader import load_all_bundles
from lib.reconciliation import reconcile_events
from lib.timeline import ConflictedEvent, extract_timeline_events, sort_events_by_date

app = FastAPI(title="Patient Timeline")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")


_CONFLICT_EXTRACTORS: dict[str, tuple[str, callable]] = {
    "date_mismatch": ("Onset", lambda e: datetime.fromisoformat(
        e.date.replace("Z", "+00:00")).strftime("%b %-d, %Y")),
    "status_mismatch": ("Status", lambda e: e.clinical_status),
    "verification_mismatch": ("Verification", lambda e: e.verification_status),
    "dosage_mismatch": ("Dose", lambda e: e.dosage),
    "value_mismatch": ("Value", lambda e: e.value),
    "criticality_mismatch": ("Criticality", lambda e: e.criticality),
    "reaction_mismatch": ("Reaction", lambda e: e.reaction),
}


def _event_details(event, conflict_types) -> list[str]:
    """Return 'Label: value' strings for the conflicting fields of a single event."""
    details = []
    for ct in conflict_types:
        if ct not in _CONFLICT_EXTRACTORS:
            continue
        label, extract = _CONFLICT_EXTRACTORS[ct]
        v = extract(event)
        if v:
            details.append(f"{label}: {v}")
    return details


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    data_sources = load_all_bundles()
    all_events = sort_events_by_date(
        [
            event
            for source in data_sources
            for event in extract_timeline_events(source.bundle, source.name)
        ]
    )
    timeline = reconcile_events(all_events)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "timeline": timeline,
            "event_count": len(all_events),
            "source_count": len(data_sources),
            "sources": DATA_SOURCES,
            "color_classes": COLOR_CLASSES,
            "get_source_colors": get_source_colors,
            "is_conflict": lambda item: isinstance(item, ConflictedEvent),
            "event_details": _event_details,
            "format_date": lambda d: datetime.fromisoformat(d.replace("Z", "+00:00")).strftime("%m/%d/%Y"),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
