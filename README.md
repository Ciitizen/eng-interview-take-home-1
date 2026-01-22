# Patient Health Record Reconciliation Challenge

## Overview

When patients receive care from multiple healthcare providers, their health data becomes fragmented across different Electronic Health Record (EHR) systems. Each system may record the same information differently, leading to inconsistencies, duplicates, and conflicts that can impact patient safety and care quality.

**Your task:** Build a system that ingests patient health records from multiple sources (in FHIR R4 format) and identifies conflicts, inconsistencies, and discrepancies between them.

## The Problem

You are given FHIR Bundle exports from three different healthcare systems for the same patient:

| System | Type | File |
|--------|------|------|
| Metro General Hospital | Hospital EHR | `data/fhir-exports/metro-general-hospital.json` |
| CityCare Primary Clinic | Ambulatory EHR | `data/fhir-exports/citycare-clinic.json` |
| HealthFirst Laboratories | Lab System | `data/fhir-exports/healthfirst-labs.json` |

The data contains realistic inconsistencies that occur in real-world healthcare scenarios, including:
- Different onset dates for the same condition
- Medication dose changes over time
- Lab values that differ between systems
- Missing allergies or conditions in some systems
- Demographic data entered differently

## Requirements

### Minimum Requirements

Build a solution that:

1. **Parses** the three FHIR Bundle JSON files
2. **Identifies conflicts** between the records, including:
   - Conditions with conflicting onset dates or verification status
   - Medications with different doses (distinguishing legitimate changes from errors)
   - Lab results with significant value discrepancies
   - Allergies with different severity or missing reaction details
   - Data present in one system but missing from others
3. **Outputs a conflict report** that clearly describes each discrepancy found

### Output Format

Your solution should produce a structured report (JSON, Markdown, or rendered UI) that includes:
- A summary of conflicts found
- For each conflict:
  - What type of conflict it is
  - Which systems are involved
  - The specific data that differs
  - Severity/priority (you decide the criteria)

### Technology

- Use any programming language or framework you prefer
- No LLM or AI API keys are required (this is a data processing challenge)
- You may use any libraries for FHIR parsing, data processing, etc.

## Evaluation Criteria

We will evaluate your submission on:

1. **Correctness**: Does your solution find the conflicts in the data?
2. **Code Quality**: Is the code well-organized, readable, and maintainable?
3. **Decision Making**: How did you handle ambiguous cases? What assumptions did you make?
4. **Completeness**: Did you handle edge cases? Is the output useful?

## Deliverables

1. **Working code** that processes the input files and produces a conflict report
2. **A brief writeup** (can be in this README or a separate file) addressing:
   - How to run your solution
   - Key design decisions you made
   - What assumptions you made about conflict detection
   - What you would do differently with more time
   - Any conflicts you found that aren't obvious

## Time Expectation

We expect this to take **3-5 hours**. Focus on a working solution first; polish if time permits.

## Getting Started

```bash
# The data files are in:
ls data/fhir-exports/

# Each file is a FHIR R4 Bundle containing:
# - Patient resource
# - Condition resources (diagnoses)
# - MedicationRequest resources (prescriptions)
# - Observation resources (labs, vitals)
# - Encounter resources (visits)
# - AllergyIntolerance resources
# - Procedure resources (only in hospital data)
```

### Example: Next.js

We've included an example Next.js 13 implementation in `examples/nextjs/` with a basic timeline visualization:

```bash
cd examples/nextjs
npm install
npm run dev
```

This example includes:
- Basic FHIR type definitions (`src/types/fhir.ts`)
- Data loading utilities (`src/lib/fhir-loader.ts`)
- Timeline event extraction (`src/lib/timeline.ts`)
- A basic timeline component (`src/components/Timeline.tsx`)

**Important:** This example simply combines events from all sources chronologically—it does **not** handle conflicts or reconciliation. You'll see duplicate entries and inconsistencies. Your task is to detect and resolve these.

You're free to build on this example, start fresh, or use a completely different tech stack.

## FHIR Resources Reference

If you're not familiar with FHIR, here are the key resources used:

- **Patient**: Demographics (name, DOB, contact info)
- **Condition**: Diagnoses with onset dates and status
- **MedicationRequest**: Prescriptions with dosing
- **Observation**: Lab results and vital signs with values
- **AllergyIntolerance**: Allergies with reactions and severity
- **Encounter**: Healthcare visits with dates and reasons

Each resource has a `meta.source` field indicating which system it came from.

For more details: [FHIR R4 Documentation](https://hl7.org/fhir/R4/)

## Useful Libraries

Here are some popular FHIR parsing libraries you may find helpful:

### Python
- **[fhir.resources](https://github.com/nazrulworld/fhir.resources)** - Pydantic-based models for all FHIR resources with built-in validation. Use `fhir.resources.r4b` for R4 support.
- **[fhirclient](https://github.com/smart-on-fhir/client-py)** - SMART on FHIR client with Pythonic data model classes for (de)serialization.
- **[fhir-py](https://pypi.org/project/fhirpy/)** - Lightweight async client using plain Python dictionaries, version-agnostic.

### JavaScript/TypeScript
- **[fhir.js](https://github.com/FHIR/fhir.js)** - Lightweight client for FHIR servers, works in browsers and Node.js.
- **[@types/fhir](https://www.npmjs.com/package/@types/fhir)** - TypeScript definitions for FHIR R4 resources.
- **[fhirpath.js](https://github.com/HL7/fhirpath.js)** - JavaScript implementation of FHIRPath for querying FHIR data.

### Java
- **[HAPI FHIR](https://hapifhir.io/)** - The most widely used Java FHIR library. Supports DSTU2 through R5, includes parsers, validators, and a JPA server.

### Other Resources
- [Official FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [FHIR R4 Resource List](https://hl7.org/fhir/R4/resourcelist.html)
- [Open Source FHIR Implementations](https://confluence.hl7.org/display/FHIR/Open+Source+Implementations)
- [Awesome FHIR](https://github.com/fhir-fuel/awesome-FHIR) - Curated list of FHIR tools and resources

## Hints

- Start by understanding the structure of a single FHIR Bundle
- Consider what makes two records "the same" across systems (matching logic)
- Think about which conflicts are clinically significant vs. trivial
- The `coding` arrays contain standardized codes (SNOMED, ICD-10, LOINC, RxNorm) that can help with matching

## Questions?

If you have questions about the requirements, make a reasonable assumption and document it in your writeup.

---

Good luck! We're excited to see your approach.
