# Patient Timeline - Solution

## Running the Application

```bash
cd examples/python
uv run python main.py
```

Open http://127.0.0.1:8000

## Approach

I built a reconciliation layer that detects conflicts across FHIR data from multiple EHR sources. The key insight is that **different resource types require different conflict rules** - a one-size-fits-all approach produces false positives.

### Conflict Detection by Category

| Resource Type | Conflict Detected When |
|---------------|----------------------|
| **Condition** | Onset dates differ, OR clinical status differs, OR verification status differs |
| **Medication** | Same drug with different doses within 30 days |
| **Observation** | Same test on same date with different values |
| **Allergy** | Criticality differs OR reaction details differ |

### Key Design Decisions

**Medications:** Doses that differ by years (e.g., Metformin 500mg in 2019 → 1000mg in 2023) are shown as separate timeline events, not conflicts. This represents a legitimate dose adjustment over time.

**Observations:** Lab results on different dates are separate tests, not conflicts. Only same-day discrepancies are flagged - these suggest a data synchronization issue.

**Conditions:** Both onset date and status/verification mismatches are flagged. A 7-month onset date discrepancy (Hypertension: Nov 2017 vs Jun 2018) is clinically significant and worth surfacing.

**Timeline positioning:** Conflicts are anchored to their earliest date for consistent chronological ordering.

**Date field selection:** The timeline uses the most clinically relevant date for each resource type:
- Conditions → `onsetDateTime` (when condition started)
- Allergies → `recordedDate` (when documented)
- Observations → `effectiveDateTime` (when test performed)
- Medications → `authoredOn` (when prescribed)

### Architecture

```
main.py               → FastAPI app, template rendering
lib/timeline.py       → FHIR parsing, TimelineEvent/ConflictedEvent dataclasses
lib/reconciliation.py → Category-specific conflict detection
lib/constants.py      → Source definitions, color mappings
lib/fhir_loader.py    → Bundle loading from JSON files
```

Events are grouped by standardized code (SNOMED, LOINC, RxNorm), then each group is checked for category-specific conflicts. Events without standardized codes are displayed but not reconciled.

## Assumptions

- Conflict detection requires events from 2+ sources with matching standardized codes
- 30-day window for medication dose conflicts (configurable via `_MAX_MED_GAP`)
- Events without SNOMED/LOINC/RxNorm codes pass through without reconciliation

## Future Improvements

1. **Unit normalization** - Hemoglobin A1c shows as both % (NGSP) and mmol/mol (IFCC). 58 mmol/mol ≈ 7.5%. These should be converted to a common unit before comparison.

2. **Allergy sidebar** - Allergies are safety-critical and should be persistently visible, not buried in the timeline.

3. **Source-type awareness** - Labs don't track allergies or conditions. A smarter system wouldn't flag "missing" data from HealthFirst Laboratories for allergy records.

4. **Confidence scoring** - Not all conflicts are equal. A 7-month date discrepancy is more concerning than a 5-day one.

5. **Show both onset and recorded dates** - For Conditions, showing both when the condition started (onset) and when it was documented (recorded) would provide fuller context.
