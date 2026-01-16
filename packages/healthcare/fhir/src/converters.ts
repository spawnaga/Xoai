import type { Patient, Observation, Encounter, MedicationRequest, Bundle } from 'fhir/r4';
import type {
  FhirPatientInput,
  FhirObservationInput,
  FhirEncounterInput,
  FhirMedicationInput,
} from './types';

/**
 * Convert patient data to FHIR R4 Patient resource
 * Ported from Asclepius/MediXAI healthcareStandards.ts
 */
export function patientToFhir(input: FhirPatientInput): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    id: input.id,
    identifier: [
      {
        system: 'urn:oid:2.16.840.1.113883.4.1',
        value: input.mrn,
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical Record Number',
            },
          ],
        },
      },
    ],
    name: [
      {
        use: 'official',
        family: input.lastName,
        given: [input.firstName],
      },
    ],
    gender: input.gender,
    birthDate: input.dateOfBirth.toISOString().split('T')[0],
  };

  // Add telecom if available
  const telecoms: Patient['telecom'] = [];
  if (input.email) {
    telecoms.push({
      system: 'email',
      value: input.email,
      use: 'home',
    });
  }
  if (input.phone) {
    telecoms.push({
      system: 'phone',
      value: input.phone,
      use: 'mobile',
    });
  }
  if (telecoms.length > 0) {
    patient.telecom = telecoms;
  }

  // Add address if available
  if (input.address || input.city || input.state || input.zipCode) {
    patient.address = [
      {
        use: 'home',
        type: 'physical',
        line: input.address ? [input.address] : undefined,
        city: input.city,
        state: input.state,
        postalCode: input.zipCode,
        country: input.country,
      },
    ];
  }

  return patient;
}

/**
 * Convert observation data to FHIR R4 Observation resource
 */
export function observationToFhir(input: FhirObservationInput): Observation {
  const observation: Observation = {
    resourceType: 'Observation',
    id: input.id,
    status: input.status || 'final',
    code: {
      coding: [
        {
          system: input.codeSystem || 'http://loinc.org',
          code: input.code,
          display: input.display,
        },
      ],
    },
    subject: {
      reference: `Patient/${input.patientId}`,
    },
    effectiveDateTime: input.effectiveDate.toISOString(),
  };

  if (input.value !== undefined) {
    if (input.unit) {
      observation.valueQuantity = {
        value: parseFloat(input.value),
        unit: input.unit,
        system: 'http://unitsofmeasure.org',
      };
    } else {
      observation.valueString = input.value;
    }
  }

  return observation;
}

/**
 * Convert encounter data to FHIR R4 Encounter resource
 */
export function encounterToFhir(input: FhirEncounterInput): Encounter {
  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: input.id,
    status: input.status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: input.type,
    },
    subject: {
      reference: `Patient/${input.patientId}`,
    },
    period: {
      start: input.startDate.toISOString(),
      end: input.endDate?.toISOString(),
    },
  };

  if (input.reason) {
    encounter.reasonCode = [
      {
        text: input.reason,
      },
    ];
  }

  return encounter;
}

/**
 * Convert medication data to FHIR R4 MedicationRequest resource
 */
export function medicationToFhir(input: FhirMedicationInput): MedicationRequest {
  const request: MedicationRequest = {
    resourceType: 'MedicationRequest',
    id: input.id,
    status: input.status || 'active',
    intent: 'order',
    subject: {
      reference: `Patient/${input.patientId}`,
    },
    medicationCodeableConcept: {
      coding: input.rxnormCode
        ? [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: input.rxnormCode,
              display: input.name,
            },
          ]
        : undefined,
      text: input.name,
    },
    authoredOn: input.startDate.toISOString(),
  };

  if (input.dosage || input.frequency || input.route) {
    request.dosageInstruction = [
      {
        text: [input.dosage, input.frequency, input.route].filter(Boolean).join(' - '),
        route: input.route
          ? {
              text: input.route,
            }
          : undefined,
      },
    ];
  }

  return request;
}

/**
 * Create a FHIR Bundle from multiple resources
 */
export function createBundle(
  resources: (Patient | Observation | Encounter | MedicationRequest)[],
  type: Bundle['type'] = 'collection'
): Bundle {
  return {
    resourceType: 'Bundle',
    type,
    timestamp: new Date().toISOString(),
    entry: resources.map((resource) => ({
      resource,
    })),
  };
}
