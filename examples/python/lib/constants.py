"""Data sources configuration - single source of truth for names, files, and colors."""

DATA_SOURCES = [
    {"name": "Metro General Hospital", "file": "metro-general-hospital.json", "color": "blue"},
    {"name": "CityCare Primary Clinic", "file": "citycare-clinic.json", "color": "green"},
    {"name": "HealthFirst Laboratories", "file": "healthfirst-labs.json", "color": "purple"},
]

COLOR_CLASSES = {
    "blue": {"bg": "bg-blue-100", "border": "border-blue-400"},
    "green": {"bg": "bg-green-100", "border": "border-green-400"},
    "purple": {"bg": "bg-purple-100", "border": "border-purple-400"},
}


def get_source_colors(source_name: str) -> dict:
    """Get Tailwind color classes for a source name."""
    source = next((s for s in DATA_SOURCES if s["name"] == source_name), None)
    if not source:
        return {"bg": "bg-gray-100", "border": "border-gray-400"}
    return COLOR_CLASSES[source["color"]]
