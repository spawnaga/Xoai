/**
 * Prescriptions Migration - MongoDB to MySQL
 * Migrates prescriptions to medications
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

type MedicationStatus = "ACTIVE" | "COMPLETED" | "STOPPED" | "ON_HOLD";

function mapMedicationStatus(status: string): MedicationStatus {
  const statusMap: Record<string, MedicationStatus> = {
    pending: "ACTIVE",
    active: "ACTIVE",
    filled: "ACTIVE",
    completed: "COMPLETED",
    cancelled: "STOPPED",
  };
  return statusMap[status?.toLowerCase()] || "ACTIVE";
}

async function migratePrescriptions() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();
    const prescriptions = await db.collection("prescriptions").find({}).toArray();

    console.log(`Found ${prescriptions.length} prescriptions to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const rx of prescriptions) {
      try {
        const patientMrn = rx.patient_id?.toString().slice(-10).toUpperCase();
        const patient = await prisma.patient.findUnique({ where: { mrn: patientMrn } });

        if (!patient) {
          console.warn(`Patient not found for prescription ${rx._id}`);
          errors++;
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
        migrated++;
      } catch (e: any) {
        console.error(`Error migrating prescription ${rx._id}: ${e.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete: ${migrated} prescriptions migrated, ${errors} errors`);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

migratePrescriptions().catch(console.error);
