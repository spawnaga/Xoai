/**
 * Patient Demographics Migration - MongoDB to MySQL
 * Migrates patients from Asclepius to Xoai
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

function mapGender(gender: string): Gender {
  const g = gender?.toLowerCase();
  if (g === "male" || g === "m") return "MALE";
  if (g === "female" || g === "f") return "FEMALE";
  if (g === "other") return "OTHER";
  return "UNKNOWN";
}

function formatAddress(patient: any): string | null {
  if (typeof patient.patient_address === "string") return patient.patient_address;
  if (patient.patient_address?.streetAddress) return patient.patient_address.streetAddress;
  return null;
}

async function migratePatients() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();
    const patients = await db.collection("patients").find({}).toArray();

    console.log(`Found ${patients.length} patients to migrate`);

    let migrated = 0;
    let errors = 0;

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
        migrated++;
      } catch (e: any) {
        console.error(`Error migrating patient ${patient._id}: ${e.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete: ${migrated} patients migrated, ${errors} errors`);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

migratePatients().catch(console.error);
