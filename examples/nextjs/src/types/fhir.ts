export interface FhirBundle {
  resourceType: "Bundle";
  type: string;
  entry?: FhirBundleEntry[];
}

export interface FhirBundleEntry {
  resource: FhirResource;
}

export interface FhirResource {
  resourceType: string;
  [key: string]: unknown;
}

export interface DataSource {
  name: string;
  bundle: FhirBundle;
}
