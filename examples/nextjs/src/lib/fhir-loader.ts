/// <reference types="@types/fhir" />

import { promises as fs } from "fs";
import path from "path";

export interface DataSource {
  name: string;
  bundle: fhir4.Bundle;
}

const DATA_DIR = path.join(process.cwd(), "..", "..", "data", "fhir-exports");

const DATA_SOURCES = [
  { name: "Metro General Hospital", file: "metro-general-hospital.json" },
  { name: "CityCare Primary Clinic", file: "citycare-clinic.json" },
  { name: "HealthFirst Laboratories", file: "healthfirst-labs.json" },
];

export async function loadAllBundles(): Promise<DataSource[]> {
  return Promise.all(
    DATA_SOURCES.map(async (source) => ({
      name: source.name,
      bundle: JSON.parse(
        await fs.readFile(path.join(DATA_DIR, source.file), "utf-8")
      ) as fhir4.Bundle,
    }))
  );
}
