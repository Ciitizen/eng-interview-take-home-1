/// <reference types="@types/fhir" />

// Re-export FHIR R4 types for convenience
export type Bundle = fhir4.Bundle;
export type BundleEntry = fhir4.BundleEntry;
export type Resource = fhir4.Resource;
export type Patient = fhir4.Patient;
export type Condition = fhir4.Condition;
export type MedicationRequest = fhir4.MedicationRequest;
export type Observation = fhir4.Observation;
export type AllergyIntolerance = fhir4.AllergyIntolerance;
export type Encounter = fhir4.Encounter;
export type Procedure = fhir4.Procedure;

// App-specific types
export interface DataSource {
  name: string;
  bundle: Bundle;
}
