import { z } from 'zod';
import { router, clinicalProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { Gender } from '@xoai/db';

// Map API gender values to Prisma enum
const genderMap: Record<string, Gender> = {
  'male': 'MALE',
  'female': 'FEMALE',
  'other': 'OTHER',
  'unknown': 'UNKNOWN',
};

// Reverse map for FHIR export
const genderToFhir: Record<string, string> = {
  'MALE': 'male',
  'FEMALE': 'female',
  'OTHER': 'other',
  'UNKNOWN': 'unknown',
};

/**
 * FHIR Router - FHIR R4 resource operations
 * Integrates with healthcare/fhir package for conversions
 */
export const fhirRouter = router({
  // Export patient as FHIR Bundle
  exportPatient: clinicalProcedure
    .input(
      z.object({
        patientId: z.string(),
        includeEncounters: z.boolean().default(true),
        includeObservations: z.boolean().default(true),
        includeMedications: z.boolean().default(true),
        format: z.enum(['json', 'xml']).default('json'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { patientId, includeEncounters, includeObservations, includeMedications } = input;

      // Get patient with related resources
      const patient = await ctx.db.patient.findUnique({
        where: { id: patientId },
        include: {
          ...(includeEncounters && { encounters: true }),
          ...(includeObservations && { observations: true }),
          ...(includeMedications && { medications: true }),
        },
      });

      if (!patient) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Patient not found',
        });
      }

      // Build FHIR Bundle
      const bundle = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [] as Array<{ resource: unknown }>,
      };

      // Add Patient resource
      bundle.entry.push({
        resource: {
          resourceType: 'Patient',
          id: patient.id,
          identifier: [
            {
              system: 'urn:xoai:mrn',
              value: patient.mrn,
            },
          ],
          name: [
            {
              use: 'official',
              family: patient.lastName,
              given: [patient.firstName],
            },
          ],
          gender: genderToFhir[patient.gender] || 'unknown',
          birthDate: patient.dateOfBirth.toISOString().split('T')[0],
          telecom: [
            ...(patient.phone ? [{ system: 'phone', value: patient.phone }] : []),
            ...(patient.email ? [{ system: 'email', value: patient.email }] : []),
          ],
          address: patient.address
            ? [
                {
                  line: [patient.address],
                  city: patient.city,
                  state: patient.state,
                  postalCode: patient.zipCode,
                },
              ]
            : undefined,
        },
      });

      // Add Encounters
      if (includeEncounters && 'encounters' in patient) {
        for (const enc of patient.encounters) {
          bundle.entry.push({
            resource: {
              resourceType: 'Encounter',
              id: enc.id,
              status: enc.status.toLowerCase(),
              class: {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                code: enc.type.toLowerCase(),
              },
              subject: { reference: `Patient/${patient.id}` },
              period: { start: enc.startDate.toISOString() },
              reasonCode: enc.reason ? [{ text: enc.reason }] : undefined,
            },
          });
        }
      }

      // Add Observations
      if (includeObservations && 'observations' in patient) {
        for (const obs of patient.observations) {
          bundle.entry.push({
            resource: {
              resourceType: 'Observation',
              id: obs.id,
              status: obs.status.toLowerCase(),
              code: {
                coding: [
                  {
                    system: obs.codeSystem,
                    code: obs.code,
                    display: obs.display,
                  },
                ],
              },
              subject: { reference: `Patient/${patient.id}` },
              effectiveDateTime: obs.effectiveDate.toISOString(),
              ...(obs.value !== null && {
                valueQuantity: {
                  value: parseFloat(obs.value || '0'),
                  unit: obs.unit,
                },
              }),
            },
          });
        }
      }

      // Add Medications
      if (includeMedications && 'medications' in patient) {
        for (const med of patient.medications) {
          bundle.entry.push({
            resource: {
              resourceType: 'MedicationRequest',
              id: med.id,
              status: med.status.toLowerCase().replace('_', '-'),
              intent: 'order',
              medicationCodeableConcept: {
                coding: [
                  ...(med.rxnormCode ? [{
                    system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                    code: med.rxnormCode,
                    display: med.name,
                  }] : [{
                    system: 'urn:xoai:medication',
                    display: med.name,
                  }]),
                ],
              },
              subject: { reference: `Patient/${patient.id}` },
              authoredOn: med.startDate.toISOString(),
              dosageInstruction: med.dosage ? [{ text: `${med.dosage} ${med.frequency || ''}`.trim() }] : undefined,
            },
          });
        }
      }

      // Log export
      await ctx.db.auditLog.create({
        data: {
          action: 'READ',
          resourceType: 'FHIRExport',
          resourceId: patient.id,
          userId: ctx.user.id,
          details: {
            type: 'patient-bundle',
            resourceCount: bundle.entry.length,
          },
        },
      });

      return bundle;
    }),

  // Import FHIR Patient resource
  importPatient: adminProcedure
    .input(
      z.object({
        resource: z.object({
          resourceType: z.literal('Patient'),
          identifier: z.array(z.object({ system: z.string(), value: z.string() })).optional(),
          name: z.array(
            z.object({
              family: z.string(),
              given: z.array(z.string()).optional(),
            })
          ),
          gender: z.enum(['male', 'female', 'other', 'unknown']).optional(),
          birthDate: z.string(),
          telecom: z
            .array(
              z.object({
                system: z.string(),
                value: z.string(),
              })
            )
            .optional(),
          address: z
            .array(
              z.object({
                line: z.array(z.string()).optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                postalCode: z.string().optional(),
              })
            )
            .optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { resource } = input;

      const name = resource.name[0];
      if (!name) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Patient name is required',
        });
      }

      const phone = resource.telecom?.find((t) => t.system === 'phone')?.value;
      const email = resource.telecom?.find((t) => t.system === 'email')?.value;
      const address = resource.address?.[0];

      const patient = await ctx.db.patient.create({
        data: {
          mrn: `MRN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          firstName: name.given?.[0] || '',
          lastName: name.family,
          dateOfBirth: new Date(resource.birthDate),
          gender: genderMap[resource.gender || 'unknown'] || 'UNKNOWN',
          phone,
          email,
          address: address?.line?.join(', '),
          city: address?.city,
          state: address?.state,
          zipCode: address?.postalCode,
          createdBy: ctx.user.id,
        },
      });

      // Log import
      await ctx.db.auditLog.create({
        data: {
          action: 'CREATE',
          resourceType: 'FHIRImport',
          resourceId: patient.id,
          userId: ctx.user.id,
          details: { type: 'patient' },
        },
      });

      return patient;
    }),

  // Get FHIR CapabilityStatement
  capabilityStatement: clinicalProcedure.query(async () => {
    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      kind: 'instance',
      software: {
        name: 'Xoai Healthcare Platform',
        version: '1.0.0',
      },
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
            {
              type: 'Encounter',
              interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            },
            {
              type: 'Observation',
              interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            },
            {
              type: 'MedicationRequest',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
          ],
        },
      ],
    };
  }),

  // Search FHIR resources
  search: clinicalProcedure
    .input(
      z.object({
        resourceType: z.enum(['Patient', 'Encounter', 'Observation', 'MedicationRequest']),
        params: z.record(z.string()).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { resourceType, params, limit } = input;

      // Build search based on resource type
      switch (resourceType) {
        case 'Patient': {
          const patients = await ctx.db.patient.findMany({
            where: params?.name
              ? {
                  OR: [
                    { firstName: { contains: params.name } },
                    { lastName: { contains: params.name } },
                  ],
                }
              : undefined,
            take: limit,
          });

          return {
            resourceType: 'Bundle',
            type: 'searchset',
            total: patients.length,
            entry: patients.map((p: { id: string; mrn: string; firstName: string; lastName: string; gender: string; dateOfBirth: Date }) => ({
              resource: {
                resourceType: 'Patient',
                id: p.id,
                identifier: [{ system: 'urn:xoai:mrn', value: p.mrn }],
                name: [{ family: p.lastName, given: [p.firstName] }],
                gender: genderToFhir[p.gender] || 'unknown',
                birthDate: p.dateOfBirth.toISOString().split('T')[0],
              },
            })),
          };
        }

        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Search for ${resourceType} not implemented`,
          });
      }
    }),
});
