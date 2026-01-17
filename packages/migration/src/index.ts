/**
 * MongoDB to MySQL Migration - Main Entry Point
 * Migrates data from Asclepius MongoDB to Xoai MySQL
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

interface MigrationResult {
  collection: string;
  exported: number;
  imported: number;
  errors: string[];
}

export async function runMigration(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();

    // Migrate Users
    results.push(await migrateUsers(db, prisma));

    // Migrate Patients
    results.push(await migratePatients(db, prisma));

    // Migrate Encounters (from visits)
    results.push(await migrateEncounters(db, prisma));

    // Migrate Observations (from vitals/medical_records)
    results.push(await migrateObservations(db, prisma));

    // Migrate Medications (from prescriptions)
    results.push(await migrateMedications(db, prisma));

    // Migrate Audit Logs
    results.push(await migrateAuditLogs(db, prisma));

    console.log("\n=== Migration Complete ===");
    results.forEach(r => {
      console.log(`${r.collection}: ${r.imported}/${r.exported} migrated`);
      if (r.errors.length > 0) {
        console.log(`  Errors: ${r.errors.length}`);
        r.errors.forEach(e => console.log(`    - ${e}`));
      }
    });

    return results;
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

async function migrateUsers(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Users...");
  const result: MigrationResult = { collection: "users", exported: 0, imported: 0, errors: [] };

  const users = await db.collection("users").find({}).toArray();
  result.exported = users.length;

  // Default password for migrated users (they will need to reset)
  const defaultHashedPassword = await hash("MigratedUser#2024!", 12);

  for (const user of users) {
    try {
      const role = mapUserRole(user.user_type);
      // Use existing hashed password if available, otherwise use default
      const password = user.user_password || defaultHashedPassword;
      await prisma.user.upsert({
        where: { email: user.user_email || `${user.user_username}@migrated.local`, username: user.user_username || user.user_email?.split('@')[0] || 'unknown' },
        update: {},
        create: {
          email: user.user_email || `${user.user_username}@migrated.local`,
          username: user.user_username || user.user_email?.split('@')[0] || 'unknown',
          password: password,
          name: `${user.user_first_name || ""} ${user.user_last_name || ""}`.trim(),
          role: role,
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
          updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`User ${user._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} users`);
  return result;
}

async function migratePatients(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Patients...");
  const result: MigrationResult = { collection: "patients", exported: 0, imported: 0, errors: [] };

  const patients = await db.collection("patients").find({}).toArray();
  result.exported = patients.length;

  for (const patient of patients) {
    try {
      const mrn = patient._id.toString().slice(-10).toUpperCase();
      await prisma.patient.upsert({
        where: { mrn },
        update: {},
        create: {
          mrn,
          firstName: patient.patient_first_name || patient.firstName || "Unknown",
          lastName: patient.patient_last_name || patient.lastName || "Unknown",
          dateOfBirth: new Date(patient.patient_dob || patient.dateOfBirth || patient.dob || "1900-01-01"),
          gender: mapGender(patient.patient_gender || patient.gender),
          email: patient.patient_email || patient.email,
          phone: patient.patient_phone_number || patient.phone,
          address: formatAddress(patient),
          city: patient.patient_city || patient.patient_address?.city,
          state: patient.patient_state || patient.patient_address?.state,
          zipCode: patient.patient_zip || patient.patient_address?.zip,
          emergencyContactName: patient.emergency_contact_name || patient.patient_emergency_contact,
          emergencyContactPhone: patient.emergency_contact_phone,
          insuranceProvider: patient.insurance_provider || patient.patient_insurance,
          insurancePolicyNumber: patient.insurance_policy_number,
          createdAt: patient.created_at ? new Date(patient.created_at) : new Date(),
          updatedAt: patient.updated_at ? new Date(patient.updated_at) : new Date(),
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`Patient ${patient._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} patients`);
  return result;
}

async function migrateEncounters(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Encounters (from visits)...");
  const result: MigrationResult = { collection: "encounters", exported: 0, imported: 0, errors: [] };

  const visits = await db.collection("visits").find({}).toArray();
  result.exported = visits.length;

  for (const visit of visits) {
    try {
      const patientMrn = visit.patient_id?.toString().slice(-10).toUpperCase();
      const patient = await prisma.patient.findUnique({ where: { mrn: patientMrn } });

      if (!patient) {
        result.errors.push(`Visit ${visit._id}: Patient not found`);
        continue;
      }

      await prisma.encounter.create({
        data: {
          patientId: patient.id,
          type: mapEncounterType(visit.visit_type),
          status: mapEncounterStatus(visit.status),
          startDate: new Date(visit.appointment_date || visit.visit_date || new Date()),
          endDate: visit.status === "completed" ? new Date(visit.appointment_date || visit.visit_date || new Date()) : null,
          reason: visit.chief_complaint,
          notes: visit.notes,
          createdAt: visit.created_at ? new Date(visit.created_at) : new Date(),
          updatedAt: visit.updated_at ? new Date(visit.updated_at) : new Date(),
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`Visit ${visit._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} encounters`);
  return result;
}

async function migrateObservations(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Observations (from medical_records vitals)...");
  const result: MigrationResult = { collection: "observations", exported: 0, imported: 0, errors: [] };

  const records = await db.collection("medical_records").find({ vital_signs: { $exists: true } }).toArray();
  result.exported = records.length;

  for (const record of records) {
    try {
      const patientMrn = record.patient_id?.toString().slice(-10).toUpperCase();
      const patient = await prisma.patient.findUnique({ where: { mrn: patientMrn } });

      if (!patient || !record.vital_signs) continue;

      const vitals = record.vital_signs;
      const observations = [];

      if (vitals.blood_pressure_systolic) {
        observations.push({ code: "8480-6", display: "Systolic BP", value: String(vitals.blood_pressure_systolic), unit: "mmHg" });
      }
      if (vitals.blood_pressure_diastolic) {
        observations.push({ code: "8462-4", display: "Diastolic BP", value: String(vitals.blood_pressure_diastolic), unit: "mmHg" });
      }
      if (vitals.heart_rate) {
        observations.push({ code: "8867-4", display: "Heart Rate", value: String(vitals.heart_rate), unit: "bpm" });
      }
      if (vitals.temperature) {
        observations.push({ code: "8310-5", display: "Body Temperature", value: String(vitals.temperature), unit: "°F" });
      }
      if (vitals.respiratory_rate) {
        observations.push({ code: "9279-1", display: "Respiratory Rate", value: String(vitals.respiratory_rate), unit: "/min" });
      }
      if (vitals.oxygen_saturation) {
        observations.push({ code: "2708-6", display: "Oxygen Saturation", value: String(vitals.oxygen_saturation), unit: "%" });
      }

      for (const obs of observations) {
        await prisma.observation.create({
          data: {
            patientId: patient.id,
            code: obs.code,
            codeSystem: "http://loinc.org",
            display: obs.display,
            value: obs.value,
            unit: obs.unit,
            status: "FINAL",
            effectiveDate: new Date(record.visit_date || record.created_at || new Date()),
            createdAt: record.created_at ? new Date(record.created_at) : new Date(),
            updatedAt: record.updated_at ? new Date(record.updated_at) : new Date(),
          },
        });
      }
      result.imported++;
    } catch (e: any) {
      result.errors.push(`Record ${record._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} observation sets`);
  return result;
}

async function migrateMedications(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Medications (from prescriptions)...");
  const result: MigrationResult = { collection: "medications", exported: 0, imported: 0, errors: [] };

  const prescriptions = await db.collection("prescriptions").find({}).toArray();
  result.exported = prescriptions.length;

  for (const rx of prescriptions) {
    try {
      const patientMrn = rx.patient_id?.toString().slice(-10).toUpperCase();
      const patient = await prisma.patient.findUnique({ where: { mrn: patientMrn } });

      if (!patient) {
        result.errors.push(`Prescription ${rx._id}: Patient not found`);
        continue;
      }

      await prisma.medication.create({
        data: {
          patientId: patient.id,
          rxnormCode: rx.rxcui,
          ndcCode: rx.ndc_number || rx.product_ndc,
          name: rx.drug_name || rx.medication_name || "Unknown",
          dosage: rx.dosage || rx.strength,
          frequency: rx.sig || rx.instructions,
          route: rx.route,
          status: mapMedicationStatus(rx.status),
          startDate: new Date(rx.date_prescribed || rx.written_date || new Date()),
          endDate: rx.expiration_date ? new Date(rx.expiration_date) : null,
          prescribedBy: rx.prescriber_name || rx.dr_name,
          createdAt: rx.created_at ? new Date(rx.created_at) : new Date(),
          updatedAt: rx.updated_at ? new Date(rx.updated_at) : new Date(),
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`Prescription ${rx._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} medications`);
  return result;
}

async function migrateAuditLogs(db: any, prisma: PrismaClient): Promise<MigrationResult> {
  console.log("\nMigrating Audit Logs...");
  const result: MigrationResult = { collection: "audit_logs", exported: 0, imported: 0, errors: [] };

  const logs = await db.collection("audit_logs").find({}).toArray();
  result.exported = logs.length;

  for (const log of logs) {
    try {
      await prisma.auditLog.create({
        data: {
          action: mapAuditAction(log.action),
          resourceType: log.resource_type || "Unknown",
          resourceId: log.resource_id,
          details: log.details || {},
          ipAddress: log.ip_address,
          userAgent: log.user_agent,
          createdAt: log.timestamp ? new Date(log.timestamp) : new Date(),
        },
      });
      result.imported++;
    } catch (e: any) {
      result.errors.push(`AuditLog ${log._id}: ${e.message}`);
    }
  }

  console.log(`  Migrated ${result.imported}/${result.exported} audit logs`);
  return result;
}

// Helper functions
function mapUserRole(type: string): "USER" | "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT" {
  const roleMap: Record<string, "USER" | "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT"> = {
    doctor: "DOCTOR",
    nurse: "NURSE",
    admin: "ADMIN",
    pharmacist: "USER",
    lab_tech: "USER",
    clerk: "USER",
  };
  return roleMap[type?.toLowerCase()] || "USER";
}

function mapGender(gender: string): "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" {
  const g = gender?.toLowerCase();
  if (g === "male" || g === "m") return "MALE";
  if (g === "female" || g === "f") return "FEMALE";
  if (g === "other") return "OTHER";
  return "UNKNOWN";
}

function mapEncounterType(type: string): "OUTPATIENT" | "INPATIENT" | "EMERGENCY" | "TELEHEALTH" | "HOME_HEALTH" {
  const typeMap: Record<string, "OUTPATIENT" | "INPATIENT" | "EMERGENCY" | "TELEHEALTH" | "HOME_HEALTH"> = {
    routine: "OUTPATIENT",
    follow_up: "OUTPATIENT",
    urgent: "EMERGENCY",
    consultation: "OUTPATIENT",
  };
  return typeMap[type?.toLowerCase()] || "OUTPATIENT";
}

function mapEncounterStatus(status: string): "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" {
  const statusMap: Record<string, "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"> = {
    scheduled: "PLANNED",
    checked_in: "IN_PROGRESS",
    in_progress: "IN_PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };
  return statusMap[status?.toLowerCase()] || "PLANNED";
}

function mapMedicationStatus(status: string): "ACTIVE" | "COMPLETED" | "STOPPED" | "ON_HOLD" {
  const statusMap: Record<string, "ACTIVE" | "COMPLETED" | "STOPPED" | "ON_HOLD"> = {
    pending: "ACTIVE",
    active: "ACTIVE",
    filled: "ACTIVE",
    completed: "COMPLETED",
    cancelled: "STOPPED",
  };
  return statusMap[status?.toLowerCase()] || "ACTIVE";
}

function mapAuditAction(action: string): "CREATE" | "READ" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "PRINT" {
  const actionMap: Record<string, "CREATE" | "READ" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "PRINT"> = {
    create: "CREATE",
    read: "READ",
    update: "UPDATE",
    delete: "DELETE",
    login: "LOGIN",
    logout: "LOGOUT",
    export: "EXPORT",
    print: "PRINT",
  };
  return actionMap[action?.toLowerCase()] || "READ";
}

function formatAddress(patient: any): string | null {
  if (typeof patient.patient_address === "string") return patient.patient_address;
  if (patient.patient_address?.streetAddress) {
    return patient.patient_address.streetAddress;
  }
  return null;
}

// Run migration if called directly
runMigration().catch(console.error);
