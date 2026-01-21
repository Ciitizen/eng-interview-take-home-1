/**
 * FHIR Patient Data Generator
 *
 * Generates synthetic patient data in FHIR R4 format, simulating exports from
 * 3 different EHR systems with realistic inconsistencies and conflicts.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// Configuration
// ============================================================================

const EHR_SYSTEMS = [
  {
    id: 'metro-general-hospital',
    name: 'Metro General Hospital',
    type: 'Hospital EHR',
    fhirEndpoint: 'https://fhir.metrogeneral.example.org/r4'
  },
  {
    id: 'citycare-clinic',
    name: 'CityCare Primary Clinic',
    type: 'Ambulatory EHR',
    fhirEndpoint: 'https://api.citycareclinic.example.org/fhir'
  },
  {
    id: 'healthfirst-labs',
    name: 'HealthFirst Laboratories',
    type: 'Laboratory Information System',
    fhirEndpoint: 'https://fhir.healthfirstlabs.example.org/api/r4'
  }
];

// Base patient that will have variations across systems
const BASE_PATIENT = {
  firstName: 'Maria',
  middleName: 'Elena',
  lastName: 'Rodriguez',
  maidenName: 'Garcia',
  birthDate: '1985-07-23',
  gender: 'female',
  ssn: '123-45-6789',
  phone: '555-867-5309',
  email: 'maria.rodriguez@email.com',
  address: {
    line: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62704'
  }
};

// ============================================================================
// FHIR Resource Generators
// ============================================================================

function generateUUID() {
  return crypto.randomUUID();
}

function generatePatientResource(ehrSystem, variations = {}) {
  const patient = { ...BASE_PATIENT, ...variations };

  return {
    resourceType: 'Patient',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    identifier: [
      {
        use: 'usual',
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical Record Number'
          }]
        },
        system: `${ehrSystem.fhirEndpoint}/patient-id`,
        value: `MRN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      }
    ],
    active: true,
    name: [{
      use: 'official',
      family: patient.lastName,
      given: [patient.firstName, patient.middleName].filter(Boolean),
      ...(patient.maidenName && variations.includeMaidenName ? {
        suffix: [`(née ${patient.maidenName})`]
      } : {})
    }],
    telecom: [
      {
        system: 'phone',
        value: patient.phone,
        use: 'mobile'
      },
      {
        system: 'email',
        value: patient.email
      }
    ],
    gender: patient.gender,
    birthDate: patient.birthDate,
    address: [{
      use: 'home',
      type: 'physical',
      line: [patient.address.line],
      city: patient.address.city,
      state: patient.address.state,
      postalCode: patient.address.postalCode,
      country: 'USA'
    }]
  };
}

function generateConditionResource(ehrSystem, patientRef, condition) {
  return {
    resourceType: 'Condition',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: condition.clinicalStatus || 'active',
        display: condition.clinicalStatus || 'Active'
      }]
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: condition.verificationStatus || 'confirmed',
        display: condition.verificationStatus || 'Confirmed'
      }]
    },
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        code: 'encounter-diagnosis',
        display: 'Encounter Diagnosis'
      }]
    }],
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: condition.snomedCode,
        display: condition.display
      },
      ...(condition.icd10Code ? [{
        system: 'http://hl7.org/fhir/sid/icd-10-cm',
        code: condition.icd10Code,
        display: condition.display
      }] : [])
      ],
      text: condition.text || condition.display
    },
    subject: { reference: patientRef },
    onsetDateTime: condition.onsetDate,
    recordedDate: condition.recordedDate || condition.onsetDate,
    ...(condition.abatementDate ? { abatementDateTime: condition.abatementDate } : {})
  };
}

function generateMedicationRequestResource(ehrSystem, patientRef, medication) {
  return {
    resourceType: 'MedicationRequest',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    status: medication.status || 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [{
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: medication.rxnormCode,
        display: medication.display
      }],
      text: medication.text || medication.display
    },
    subject: { reference: patientRef },
    authoredOn: medication.authoredOn,
    requester: {
      display: medication.prescriberName || 'Unknown Provider'
    },
    dosageInstruction: [{
      text: medication.dosageText,
      timing: {
        repeat: {
          frequency: medication.frequency || 1,
          period: medication.period || 1,
          periodUnit: medication.periodUnit || 'd'
        }
      },
      ...(medication.route ? {
        route: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: medication.routeCode || '26643006',
            display: medication.route
          }]
        }
      } : {}),
      doseAndRate: [{
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/dose-rate-type',
            code: 'ordered',
            display: 'Ordered'
          }]
        },
        doseQuantity: {
          value: medication.doseValue,
          unit: medication.doseUnit,
          system: 'http://unitsofmeasure.org',
          code: medication.doseUnitCode || medication.doseUnit
        }
      }]
    }],
    dispenseRequest: {
      validityPeriod: {
        start: medication.authoredOn,
        ...(medication.validityEnd ? { end: medication.validityEnd } : {})
      },
      numberOfRepeatsAllowed: medication.refills || 0,
      quantity: {
        value: medication.dispenseQuantity || 30,
        unit: medication.dispenseUnit || 'tablets'
      }
    }
  };
}

function generateObservationResource(ehrSystem, patientRef, observation) {
  return {
    resourceType: 'Observation',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    status: observation.status || 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: observation.category || 'laboratory',
        display: observation.categoryDisplay || 'Laboratory'
      }]
    }],
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: observation.loincCode,
        display: observation.display
      }],
      text: observation.text || observation.display
    },
    subject: { reference: patientRef },
    effectiveDateTime: observation.effectiveDate,
    issued: observation.issuedDate || observation.effectiveDate,
    ...(observation.value !== undefined ? {
      valueQuantity: {
        value: observation.value,
        unit: observation.unit,
        system: 'http://unitsofmeasure.org',
        code: observation.unitCode || observation.unit
      }
    } : {}),
    ...(observation.valueString ? {
      valueString: observation.valueString
    } : {}),
    ...(observation.interpretation ? {
      interpretation: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: observation.interpretation,
          display: observation.interpretationDisplay
        }]
      }]
    } : {}),
    ...(observation.referenceRange ? {
      referenceRange: [{
        low: observation.referenceRange.low ? {
          value: observation.referenceRange.low,
          unit: observation.unit
        } : undefined,
        high: observation.referenceRange.high ? {
          value: observation.referenceRange.high,
          unit: observation.unit
        } : undefined,
        text: observation.referenceRange.text
      }]
    } : {})
  };
}

function generateEncounterResource(ehrSystem, patientRef, encounter) {
  return {
    resourceType: 'Encounter',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    status: encounter.status || 'finished',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounter.class || 'AMB',
      display: encounter.classDisplay || 'ambulatory'
    },
    type: [{
      coding: [{
        system: 'http://snomed.info/sct',
        code: encounter.typeCode || '185349003',
        display: encounter.typeDisplay || 'Encounter for check up'
      }],
      text: encounter.typeText || encounter.typeDisplay
    }],
    subject: { reference: patientRef },
    period: {
      start: encounter.start,
      ...(encounter.end ? { end: encounter.end } : {})
    },
    ...(encounter.reasonCode ? {
      reasonCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: encounter.reasonCode,
          display: encounter.reasonDisplay
        }],
        text: encounter.reasonText || encounter.reasonDisplay
      }]
    } : {}),
    serviceProvider: {
      display: ehrSystem.name
    }
  };
}

function generateAllergyIntoleranceResource(ehrSystem, patientRef, allergy) {
  return {
    resourceType: 'AllergyIntolerance',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: allergy.clinicalStatus || 'active',
        display: allergy.clinicalStatus || 'Active'
      }]
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: allergy.verificationStatus || 'confirmed',
        display: allergy.verificationStatus || 'Confirmed'
      }]
    },
    type: allergy.type || 'allergy',
    category: [allergy.category || 'medication'],
    criticality: allergy.criticality || 'high',
    code: {
      coding: [{
        system: allergy.codeSystem || 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: allergy.code,
        display: allergy.display
      }],
      text: allergy.text || allergy.display
    },
    patient: { reference: patientRef },
    onsetDateTime: allergy.onsetDate,
    recordedDate: allergy.recordedDate || allergy.onsetDate,
    reaction: allergy.reactions ? allergy.reactions.map(r => ({
      substance: {
        coding: [{
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: allergy.code,
          display: allergy.display
        }]
      },
      manifestation: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: r.code,
          display: r.display
        }]
      }],
      severity: r.severity || 'moderate'
    })) : []
  };
}

function generateProcedureResource(ehrSystem, patientRef, procedure) {
  return {
    resourceType: 'Procedure',
    id: generateUUID(),
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      source: ehrSystem.fhirEndpoint
    },
    status: procedure.status || 'completed',
    code: {
      coding: [{
        system: 'http://snomed.info/sct',
        code: procedure.snomedCode,
        display: procedure.display
      },
      ...(procedure.cptCode ? [{
        system: 'http://www.ama-assn.org/go/cpt',
        code: procedure.cptCode,
        display: procedure.display
      }] : [])
      ],
      text: procedure.text || procedure.display
    },
    subject: { reference: patientRef },
    performedDateTime: procedure.performedDate,
    ...(procedure.reasonCode ? {
      reasonCode: [{
        coding: [{
          system: 'http://snomed.info/sct',
          code: procedure.reasonCode,
          display: procedure.reasonDisplay
        }]
      }]
    } : {}),
    performer: procedure.performerName ? [{
      actor: {
        display: procedure.performerName
      }
    }] : []
  };
}

// ============================================================================
// Data Definitions - Events for Each EHR System
// ============================================================================

function getMetroGeneralData(patientRef) {
  // Hospital EHR - has inpatient encounters, procedures, some labs
  return {
    conditions: [
      {
        snomedCode: '44054006',
        icd10Code: 'E11.9',
        display: 'Type 2 diabetes mellitus',
        text: 'Diabetes Mellitus Type 2',
        onsetDate: '2019-03-15',
        recordedDate: '2019-03-15',
        clinicalStatus: 'active'
      },
      {
        snomedCode: '38341003',
        icd10Code: 'I10',
        display: 'Hypertensive disorder',
        text: 'Essential Hypertension',
        onsetDate: '2018-06-20', // CONFLICT: Different onset date than clinic
        recordedDate: '2018-06-20',
        clinicalStatus: 'active'
      },
      {
        snomedCode: '267036007',
        icd10Code: 'R00.0',
        display: 'Dyspnea',
        text: 'Shortness of breath',
        onsetDate: '2024-01-10',
        recordedDate: '2024-01-10',
        clinicalStatus: 'active',
        verificationStatus: 'provisional' // CONFLICT: provisional vs confirmed elsewhere
      }
    ],
    medications: [
      {
        rxnormCode: '860975',
        display: 'Metformin 500 MG Oral Tablet',
        text: 'Metformin 500mg',
        authoredOn: '2019-03-15',
        dosageText: 'Take 1 tablet by mouth twice daily',
        doseValue: 500,
        doseUnit: 'mg',
        frequency: 2,
        period: 1,
        periodUnit: 'd',
        route: 'Oral',
        refills: 3,
        dispenseQuantity: 60,
        prescriberName: 'Dr. Sarah Chen'
      },
      {
        rxnormCode: '314076',
        display: 'Lisinopril 10 MG Oral Tablet',
        text: 'Lisinopril 10mg',
        authoredOn: '2018-06-20',
        dosageText: 'Take 1 tablet by mouth once daily',
        doseValue: 10,
        doseUnit: 'mg',
        frequency: 1,
        period: 1,
        periodUnit: 'd',
        route: 'Oral',
        refills: 5,
        prescriberName: 'Dr. Sarah Chen'
      }
    ],
    observations: [
      {
        loincCode: '4548-4',
        display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
        text: 'HbA1c',
        effectiveDate: '2024-01-10T09:30:00Z',
        value: 7.2, // CONFLICT: Different value than lab
        unit: '%',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6 %' },
        category: 'laboratory'
      },
      {
        loincCode: '85354-9',
        display: 'Blood pressure panel with all children optional',
        text: 'Blood Pressure',
        effectiveDate: '2024-01-10T08:15:00Z',
        valueString: '142/88 mmHg',
        category: 'vital-signs',
        categoryDisplay: 'Vital Signs'
      }
    ],
    encounters: [
      {
        class: 'IMP',
        classDisplay: 'inpatient encounter',
        typeCode: '32485007',
        typeDisplay: 'Hospital admission',
        typeText: 'Inpatient Admission - Chest Pain Evaluation',
        start: '2024-01-10T07:30:00Z',
        end: '2024-01-12T11:00:00Z',
        reasonCode: '29857009',
        reasonDisplay: 'Chest pain',
        reasonText: 'Chest pain, rule out cardiac event'
      },
      {
        class: 'EMER',
        classDisplay: 'emergency',
        typeCode: '4525004',
        typeDisplay: 'Emergency department patient visit',
        start: '2023-08-05T22:15:00Z',
        end: '2023-08-06T03:45:00Z',
        reasonCode: '422587007',
        reasonDisplay: 'Nausea',
        reasonText: 'Severe nausea and vomiting'
      }
    ],
    procedures: [
      {
        snomedCode: '40701008',
        cptCode: '93000',
        display: 'Electrocardiogram',
        text: 'ECG - 12 lead',
        performedDate: '2024-01-10T08:00:00Z',
        performerName: 'Dr. Michael Torres',
        reasonCode: '29857009',
        reasonDisplay: 'Chest pain'
      },
      {
        snomedCode: '169069000',
        cptCode: '71046',
        display: 'Chest X-ray',
        text: 'Chest X-ray PA and Lateral',
        performedDate: '2024-01-10T09:00:00Z',
        performerName: 'Radiology Dept',
        reasonCode: '267036007',
        reasonDisplay: 'Dyspnea'
      }
    ],
    allergies: [
      {
        code: '7980',
        display: 'Penicillin',
        text: 'Penicillin allergy',
        type: 'allergy',
        category: 'medication',
        criticality: 'high',
        onsetDate: '2005-01-01', // CONFLICT: Different date than clinic (patient reported differently)
        reactions: [
          { code: '271807003', display: 'Skin rash', severity: 'moderate' },
          { code: '267036007', display: 'Dyspnea', severity: 'severe' }
        ]
      }
    ]
  };
}

function getCityCareClinicData(patientRef) {
  // Primary care clinic - routine visits, chronic disease management
  return {
    conditions: [
      {
        snomedCode: '44054006',
        icd10Code: 'E11.65',
        display: 'Type 2 diabetes mellitus without complications',
        text: 'Type 2 Diabetes', // Slightly different text
        onsetDate: '2019-03-10', // CONFLICT: 5 days earlier than hospital record
        recordedDate: '2019-03-10',
        clinicalStatus: 'active'
      },
      {
        snomedCode: '59621000',
        icd10Code: 'I10',
        display: 'Essential hypertension',
        text: 'High Blood Pressure',
        onsetDate: '2017-11-15', // CONFLICT: Much earlier onset than hospital
        recordedDate: '2017-11-15',
        clinicalStatus: 'active'
      },
      {
        snomedCode: '267036007',
        icd10Code: 'R06.02',
        display: 'Shortness of breath',
        text: 'SOB on exertion',
        onsetDate: '2024-01-08', // CONFLICT: 2 days earlier
        recordedDate: '2024-01-15',
        clinicalStatus: 'active',
        verificationStatus: 'confirmed' // CONFLICT: confirmed vs provisional
      },
      {
        snomedCode: '73211009',
        icd10Code: 'E78.5',
        display: 'Hyperlipidemia',
        text: 'High Cholesterol',
        onsetDate: '2020-02-20',
        recordedDate: '2020-02-20',
        clinicalStatus: 'active'
      }
    ],
    medications: [
      {
        rxnormCode: '861007',
        display: 'Metformin hydrochloride 1000 MG Oral Tablet',
        text: 'Metformin 1000mg', // CONFLICT: Different dose than hospital
        authoredOn: '2023-09-15', // Dose was increased
        dosageText: 'Take 1 tablet by mouth twice daily with meals',
        doseValue: 1000,
        doseUnit: 'mg',
        frequency: 2,
        period: 1,
        periodUnit: 'd',
        route: 'Oral',
        refills: 5,
        dispenseQuantity: 60,
        prescriberName: 'Dr. James Wilson'
      },
      {
        rxnormCode: '314077',
        display: 'Lisinopril 20 MG Oral Tablet',
        text: 'Lisinopril 20mg', // CONFLICT: Different dose (20 vs 10)
        authoredOn: '2023-06-10', // Dose increased
        dosageText: 'Take 1 tablet by mouth once daily in the morning',
        doseValue: 20,
        doseUnit: 'mg',
        frequency: 1,
        period: 1,
        periodUnit: 'd',
        route: 'Oral',
        refills: 11,
        prescriberName: 'Dr. James Wilson'
      },
      {
        rxnormCode: '617312',
        display: 'Atorvastatin 20 MG Oral Tablet',
        text: 'Atorvastatin 20mg',
        authoredOn: '2020-02-20',
        dosageText: 'Take 1 tablet by mouth once daily at bedtime',
        doseValue: 20,
        doseUnit: 'mg',
        frequency: 1,
        period: 1,
        periodUnit: 'd',
        route: 'Oral',
        refills: 5,
        prescriberName: 'Dr. James Wilson'
      }
    ],
    observations: [
      {
        loincCode: '29463-7',
        display: 'Body weight',
        text: 'Weight',
        effectiveDate: '2024-01-15T10:00:00Z',
        value: 78.5,
        unit: 'kg',
        category: 'vital-signs',
        categoryDisplay: 'Vital Signs'
      },
      {
        loincCode: '8302-2',
        display: 'Body height',
        text: 'Height',
        effectiveDate: '2024-01-15T10:00:00Z',
        value: 165,
        unit: 'cm',
        category: 'vital-signs',
        categoryDisplay: 'Vital Signs'
      },
      {
        loincCode: '85354-9',
        display: 'Blood pressure panel',
        text: 'BP',
        effectiveDate: '2024-01-15T10:05:00Z',
        valueString: '138/85 mmHg', // Different from hospital reading
        category: 'vital-signs',
        categoryDisplay: 'Vital Signs'
      }
    ],
    encounters: [
      {
        class: 'AMB',
        classDisplay: 'ambulatory',
        typeCode: '185349003',
        typeDisplay: 'Encounter for check up',
        typeText: 'Annual Physical Examination',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T10:45:00Z'
      },
      {
        class: 'AMB',
        classDisplay: 'ambulatory',
        typeCode: '185347001',
        typeDisplay: 'Encounter for problem',
        typeText: 'Diabetes Follow-up',
        start: '2023-09-15T14:00:00Z',
        end: '2023-09-15T14:30:00Z',
        reasonCode: '44054006',
        reasonDisplay: 'Type 2 diabetes mellitus'
      },
      {
        class: 'AMB',
        classDisplay: 'ambulatory',
        typeCode: '185347001',
        typeDisplay: 'Encounter for problem',
        typeText: 'Hypertension Follow-up',
        start: '2023-06-10T09:00:00Z',
        end: '2023-06-10T09:30:00Z',
        reasonCode: '59621000',
        reasonDisplay: 'Essential hypertension'
      }
    ],
    procedures: [
      {
        snomedCode: '43396009',
        cptCode: '99396',
        display: 'Physical examination',
        text: 'Comprehensive Physical Exam',
        performedDate: '2024-01-15T10:00:00Z',
        performerName: 'Dr. James Wilson'
      }
    ],
    allergies: [
      {
        code: '7980',
        display: 'Penicillin V',
        text: 'Penicillin V Potassium allergy', // Slightly more specific
        type: 'allergy',
        category: 'medication',
        criticality: 'high',
        onsetDate: '2010-06-15', // CONFLICT: Different date (patient couldn't remember exact date)
        reactions: [
          { code: '271807003', display: 'Eruption of skin', severity: 'moderate' }
          // Missing dyspnea reaction that hospital has
        ]
      },
      {
        code: '1191',
        codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        display: 'Aspirin',
        text: 'Aspirin sensitivity',
        type: 'intolerance', // Not allergy, intolerance
        category: 'medication',
        criticality: 'low',
        onsetDate: '2015-03-20',
        reactions: [
          { code: '271681002', display: 'Stomach ache', severity: 'mild' }
        ]
      }
    ]
  };
}

function getHealthFirstLabsData(patientRef) {
  // Lab system - mostly lab results
  return {
    conditions: [], // Labs don't typically have diagnosis
    medications: [], // Labs don't manage medications
    observations: [
      {
        loincCode: '4548-4',
        display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
        text: 'Glycated Hemoglobin (HbA1c)',
        effectiveDate: '2024-01-10T11:45:00Z', // Same day as hospital, different time
        issuedDate: '2024-01-10T16:30:00Z',
        value: 7.4, // CONFLICT: 7.4% vs 7.2% at hospital (within acceptable variance?)
        unit: '%',
        unitCode: '%',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { low: 4.0, high: 5.6, text: 'Normal: < 5.7%, Prediabetes: 5.7-6.4%, Diabetes: >= 6.5%' },
        category: 'laboratory'
      },
      {
        loincCode: '2339-0',
        display: 'Glucose [Mass/volume] in Blood',
        text: 'Fasting Blood Glucose',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T12:00:00Z',
        value: 156,
        unit: 'mg/dL',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { low: 70, high: 100, text: '70 - 100 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '2093-3',
        display: 'Cholesterol [Mass/volume] in Serum or Plasma',
        text: 'Total Cholesterol',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T14:00:00Z',
        value: 210,
        unit: 'mg/dL',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { high: 200, text: 'Desirable: < 200 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '2571-8',
        display: 'Triglycerides [Mass/volume] in Serum or Plasma',
        text: 'Triglycerides',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T14:00:00Z',
        value: 175,
        unit: 'mg/dL',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { high: 150, text: 'Normal: < 150 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '2085-9',
        display: 'HDL Cholesterol [Mass/volume] in Serum or Plasma',
        text: 'HDL Cholesterol',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T14:00:00Z',
        value: 42,
        unit: 'mg/dL',
        interpretation: 'L',
        interpretationDisplay: 'Low',
        referenceRange: { low: 40, text: 'Low: < 40 mg/dL, Optimal: >= 60 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '2089-1',
        display: 'LDL Cholesterol [Mass/volume] in Serum or Plasma',
        text: 'LDL Cholesterol (calculated)',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T14:00:00Z',
        value: 133,
        unit: 'mg/dL',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { high: 100, text: 'Optimal: < 100 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '2160-0',
        display: 'Creatinine [Mass/volume] in Serum or Plasma',
        text: 'Serum Creatinine',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T12:00:00Z',
        value: 0.9,
        unit: 'mg/dL',
        referenceRange: { low: 0.6, high: 1.2, text: '0.6 - 1.2 mg/dL' },
        category: 'laboratory'
      },
      {
        loincCode: '3094-0',
        display: 'Urea nitrogen [Mass/volume] in Serum or Plasma',
        text: 'BUN',
        effectiveDate: '2024-01-10T07:00:00Z',
        issuedDate: '2024-01-10T12:00:00Z',
        value: 18,
        unit: 'mg/dL',
        referenceRange: { low: 7, high: 20, text: '7 - 20 mg/dL' },
        category: 'laboratory'
      },
      // Historical labs for trending
      {
        loincCode: '4548-4',
        display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
        text: 'HbA1c',
        effectiveDate: '2023-07-15T08:00:00Z',
        issuedDate: '2023-07-15T14:00:00Z',
        value: 7.8,
        unit: '%',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6 %' },
        category: 'laboratory'
      },
      {
        loincCode: '4548-4',
        display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
        text: 'HbA1c',
        effectiveDate: '2023-01-20T09:00:00Z',
        issuedDate: '2023-01-20T15:00:00Z',
        value: 8.1,
        unit: '%',
        interpretation: 'H',
        interpretationDisplay: 'High',
        referenceRange: { low: 4.0, high: 5.6, text: '4.0 - 5.6 %' },
        category: 'laboratory'
      }
    ],
    encounters: [
      {
        class: 'AMB',
        classDisplay: 'ambulatory',
        typeCode: '165081005',
        typeDisplay: 'Laboratory test',
        typeText: 'Lab Visit - Comprehensive Metabolic Panel + Lipid Panel + HbA1c',
        start: '2024-01-10T06:45:00Z',
        end: '2024-01-10T07:15:00Z'
      },
      {
        class: 'AMB',
        classDisplay: 'ambulatory',
        typeCode: '165081005',
        typeDisplay: 'Laboratory test',
        typeText: 'Lab Visit - HbA1c',
        start: '2023-07-15T07:30:00Z',
        end: '2023-07-15T08:00:00Z'
      }
    ],
    procedures: [],
    allergies: [] // Labs don't typically manage allergies
  };
}

// ============================================================================
// FHIR Bundle Generator
// ============================================================================

function generateBundle(ehrSystem, resources) {
  return {
    resourceType: 'Bundle',
    id: generateUUID(),
    meta: {
      lastUpdated: new Date().toISOString()
    },
    type: 'searchset',
    total: resources.length,
    link: [{
      relation: 'self',
      url: `${ehrSystem.fhirEndpoint}/Patient/$everything`
    }],
    entry: resources.map(resource => ({
      fullUrl: `${ehrSystem.fhirEndpoint}/${resource.resourceType}/${resource.id}`,
      resource: resource,
      search: {
        mode: 'match'
      }
    }))
  };
}

function generateEHRExport(ehrSystem, getData) {
  // Generate patient with system-specific variations
  const patientVariations = {
    'metro-general-hospital': {
      phone: '555-867-5309',
      // Hospital has formal registration
    },
    'citycare-clinic': {
      phone: '(555) 867-5309', // Different phone format
      includeMaidenName: true
    },
    'healthfirst-labs': {
      phone: '5558675309', // No formatting
      email: 'mrodriguez@email.com' // Slightly different email
    }
  };

  const patient = generatePatientResource(ehrSystem, patientVariations[ehrSystem.id] || {});
  const patientRef = `Patient/${patient.id}`;

  const data = getData(patientRef);

  const resources = [patient];

  // Generate all resources
  data.conditions.forEach(c => {
    resources.push(generateConditionResource(ehrSystem, patientRef, c));
  });

  data.medications.forEach(m => {
    resources.push(generateMedicationRequestResource(ehrSystem, patientRef, m));
  });

  data.observations.forEach(o => {
    resources.push(generateObservationResource(ehrSystem, patientRef, o));
  });

  data.encounters.forEach(e => {
    resources.push(generateEncounterResource(ehrSystem, patientRef, e));
  });

  data.procedures.forEach(p => {
    resources.push(generateProcedureResource(ehrSystem, patientRef, p));
  });

  data.allergies.forEach(a => {
    resources.push(generateAllergyIntoleranceResource(ehrSystem, patientRef, a));
  });

  return generateBundle(ehrSystem, resources);
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  const outputDir = path.join(__dirname, '..', 'data', 'fhir-exports');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dataGenerators = {
    'metro-general-hospital': getMetroGeneralData,
    'citycare-clinic': getCityCareClinicData,
    'healthfirst-labs': getHealthFirstLabsData
  };

  const exports = {};

  EHR_SYSTEMS.forEach(ehrSystem => {
    console.log(`Generating data for ${ehrSystem.name}...`);

    const bundle = generateEHRExport(ehrSystem, dataGenerators[ehrSystem.id]);

    const filename = `${ehrSystem.id}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2));
    console.log(`  Written to ${filepath}`);
    console.log(`  Resources: ${bundle.total}`);

    exports[ehrSystem.id] = {
      filename,
      resourceCount: bundle.total,
      resourceTypes: [...new Set(bundle.entry.map(e => e.resource.resourceType))]
    };
  });

  // Generate a manifest file
  const manifest = {
    generatedAt: new Date().toISOString(),
    description: 'Synthetic patient data from 3 EHR systems with intentional conflicts for reconciliation exercise',
    patient: {
      name: `${BASE_PATIENT.firstName} ${BASE_PATIENT.lastName}`,
      birthDate: BASE_PATIENT.birthDate
    },
    exports: exports,
    knownConflicts: [
      {
        type: 'condition_onset_date',
        description: 'Hypertension onset date differs between Metro General (2018-06-20) and CityCare (2017-11-15)',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'condition_onset_date',
        description: 'Type 2 Diabetes onset date differs by 5 days between systems',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'condition_verification_status',
        description: 'Dyspnea is "provisional" at Metro General but "confirmed" at CityCare',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'medication_dose',
        description: 'Metformin dose is 500mg at Metro General but 1000mg at CityCare (dose increase over time)',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'medication_dose',
        description: 'Lisinopril dose is 10mg at Metro General but 20mg at CityCare (dose increase over time)',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'lab_value_discrepancy',
        description: 'HbA1c on same day: 7.2% at Metro General vs 7.4% at HealthFirst Labs',
        systems: ['metro-general-hospital', 'healthfirst-labs']
      },
      {
        type: 'allergy_onset_date',
        description: 'Penicillin allergy onset varies: 2005 (Metro), 2010 (CityCare) - patient reported differently',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'allergy_detail',
        description: 'Penicillin allergy reactions differ - Metro has dyspnea reaction, CityCare only has skin eruption',
        systems: ['metro-general-hospital', 'citycare-clinic']
      },
      {
        type: 'missing_data',
        description: 'Aspirin intolerance only documented at CityCare, not at Metro General',
        systems: ['citycare-clinic']
      },
      {
        type: 'missing_data',
        description: 'Hyperlipidemia condition only documented at CityCare, not at Metro General',
        systems: ['citycare-clinic']
      },
      {
        type: 'patient_contact',
        description: 'Phone number format differs across all three systems',
        systems: ['metro-general-hospital', 'citycare-clinic', 'healthfirst-labs']
      },
      {
        type: 'patient_contact',
        description: 'Email slightly different at HealthFirst Labs',
        systems: ['healthfirst-labs']
      }
    ]
  };

  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\nManifest written to ${path.join(outputDir, 'manifest.json')}`);

  console.log('\n=== Generation Complete ===');
  console.log(`Total known conflicts: ${manifest.knownConflicts.length}`);
}

main();
