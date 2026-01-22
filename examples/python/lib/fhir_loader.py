"""Load FHIR bundles from JSON files."""

import json
from pathlib import Path
from typing import Any

from .constants import DATA_SOURCES

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "fhir-exports"


def load_all_bundles() -> list[dict[str, Any]]:
    """Load all FHIR bundles from the data directory."""
    return [
        {
            "name": source["name"],
            "bundle": json.loads((DATA_DIR / source["file"]).read_text()),
        }
        for source in DATA_SOURCES
    ]
