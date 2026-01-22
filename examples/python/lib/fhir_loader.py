"""Load FHIR bundles from JSON files."""

from dataclasses import dataclass
from pathlib import Path

from fhir.resources.R4B.bundle import Bundle

from .constants import DATA_SOURCES

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "fhir-exports"


@dataclass
class DataSource:
    name: str
    bundle: Bundle


def load_all_bundles() -> list[DataSource]:
    """Load all FHIR bundles from the data directory."""
    return [
        DataSource(
            name=source["name"],
            bundle=Bundle.model_validate_json((DATA_DIR / source["file"]).read_text()),
        )
        for source in DATA_SOURCES
    ]
