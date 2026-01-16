/**
 * Clinical Data Migration - MongoDB to MySQL
 * Migrates vitals, diagnoses from medical_records to observations
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

interface VitalObservation {
  code: string;
  display: string;
  value: string;
  unit: string;
}

async function migrateClinical() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();
    const records = await db.collection("medical_records").find({ vital_signs: { $exists: true } }).toArray();

    console.log(`Found ${records.length} medical records with vitals`);

    let migrated = 0;
    let observationsCreated = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const patientMrn = record.patient_id?.toString().slice(-10).toUpperCase();
        const patient = await prisma.patient.findUnique({ where: { mrn: patientMrn } });

        if (!patient || !record.vital_signs) continue;

        const vitals = record.vital_signs;
        const observations: VitalObservation[] = [];

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
        if (vitals.weight) {
          observations.push({ code: "29463-7", display: "Body Weight", value: String(vitals.weight), unit: "kg" });
        }
        if (vitals.height) {
          observations.push({ code: "8302-2", display: "Body Height", value: String(vitals.height), unit: "cm" });
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
          observationsCreated++;
        }
        migrated++;
      } catch (e: any) {
        console.error(`Error migrating record ${record._id}: ${e.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete:`);
    console.log(`   ${migrated} records processed`);
    console.log(`   ${observationsCreated} observations created`);
    console.log(`   ${errors} errors`);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

migrateClinical().catch(console.error);
