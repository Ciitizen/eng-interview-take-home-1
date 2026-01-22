"""Patient Timeline - FastAPI application."""

from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from lib.constants import DATA_SOURCES, COLOR_CLASSES, get_source_colors
from lib.fhir_loader import load_all_bundles
from lib.timeline import extract_timeline_events, sort_events_by_date

app = FastAPI(title="Patient Timeline")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")


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

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "events": all_events,
            "event_count": len(all_events),
            "source_count": len(data_sources),
            "sources": DATA_SOURCES,
            "color_classes": COLOR_CLASSES,
            "get_source_colors": get_source_colors,
            "format_date": lambda d: datetime.fromisoformat(d.replace("Z", "+00:00")).strftime("%m/%d/%Y"),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
