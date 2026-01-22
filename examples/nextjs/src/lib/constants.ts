/** Data sources configuration - single source of truth for names, files, and colors */
export const DATA_SOURCES = [
  { name: "Metro General Hospital", file: "metro-general-hospital.json", color: "blue" },
  { name: "CityCare Primary Clinic", file: "citycare-clinic.json", color: "green" },
  { name: "HealthFirst Laboratories", file: "healthfirst-labs.json", color: "purple" },
] as const;

export type SourceName = (typeof DATA_SOURCES)[number]["name"];
export type SourceColor = (typeof DATA_SOURCES)[number]["color"];

/** Tailwind classes for each color */
export const COLOR_CLASSES: Record<SourceColor, { bg: string; border: string }> = {
  blue: { bg: "bg-blue-100", border: "border-blue-400" },
  green: { bg: "bg-green-100", border: "border-green-400" },
  purple: { bg: "bg-purple-100", border: "border-purple-400" },
};

/** Get color classes for a source name */
export function getSourceColors(sourceName: string) {
  const source = DATA_SOURCES.find((s) => s.name === sourceName);
  if (!source) return { bg: "bg-gray-100", border: "border-gray-400" };
  return COLOR_CLASSES[source.color];
}
