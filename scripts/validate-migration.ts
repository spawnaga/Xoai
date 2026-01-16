/**
 * Validate Migration - Data Integrity Checks
 * Compares MongoDB and MySQL data for consistency
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

interface ValidationResult {
  collection: string;
  mongoCount: number;
  mysqlCount: number;
  status: "pass" | "warn" | "fail";
  message: string;
}

async function validateMigration() {
  const mongo = new MongoClient(MONGO_URI);
  const results: ValidationResult[] = [];

  try {
    await mongo.connect();
    const db = mongo.db();

    console.log("=== Migration Validation Report ===\n");

    // Users
    const usersMongo = await db.collection("users").countDocuments();
    const usersMySQL = await prisma.user.count();
    results.push({
      collection: "users → User",
      mongoCount: usersMongo,
      mysqlCount: usersMySQL,
      status: usersMySQL >= usersMongo ? "pass" : "warn",
      message: usersMySQL >= usersMongo ? "OK" : `Missing ${usersMongo - usersMySQL} records`,
    });

    // Patients
    const patientsMongo = await db.collection("patients").countDocuments();
    const patientsMySQL = await prisma.patient.count();
    results.push({
      collection: "patients → Patient",
      mongoCount: patientsMongo,
      mysqlCount: patientsMySQL,
      status: patientsMySQL >= patientsMongo ? "pass" : "warn",
      message: patientsMySQL >= patientsMongo ? "OK" : `Missing ${patientsMongo - patientsMySQL} records`,
    });

    // Visits → Encounters
    const visitsMongo = await db.collection("visits").countDocuments();
    const encountersMySQL = await prisma.encounter.count();
    results.push({
      collection: "visits → Encounter",
      mongoCount: visitsMongo,
      mysqlCount: encountersMySQL,
      status: encountersMySQL >= visitsMongo ? "pass" : "warn",
      message: encountersMySQL >= visitsMongo ? "OK" : `Missing ${visitsMongo - encountersMySQL} records`,
    });

    // Prescriptions → Medications
    const rxMongo = await db.collection("prescriptions").countDocuments();
    const medsMySQL = await prisma.medication.count();
    results.push({
      collection: "prescriptions → Medication",
      mongoCount: rxMongo,
      mysqlCount: medsMySQL,
      status: medsMySQL >= rxMongo ? "pass" : "warn",
      message: medsMySQL >= rxMongo ? "OK" : `Missing ${rxMongo - medsMySQL} records`,
    });

    // Medical Records → Observations
    const recordsMongo = await db.collection("medical_records").countDocuments({ vital_signs: { $exists: true } });
    const obsMySQL = await prisma.observation.count();
    results.push({
      collection: "medical_records → Observation",
      mongoCount: recordsMongo,
      mysqlCount: obsMySQL,
      status: obsMySQL > 0 ? "pass" : "warn",
      message: `${recordsMongo} records → ${obsMySQL} observations`,
    });

    // Audit Logs
    const auditMongo = await db.collection("audit_logs").countDocuments();
    const auditMySQL = await prisma.auditLog.count();
    results.push({
      collection: "audit_logs → AuditLog",
      mongoCount: auditMongo,
      mysqlCount: auditMySQL,
      status: auditMySQL >= auditMongo ? "pass" : "warn",
      message: auditMySQL >= auditMongo ? "OK" : `Missing ${auditMongo - auditMySQL} records`,
    });

    // Print results
    for (const r of results) {
      const icon = r.status === "pass" ? "✅" : r.status === "warn" ? "⚠️" : "❌";
      console.log(`${icon} ${r.collection}`);
      console.log(`   MongoDB: ${r.mongoCount} | MySQL: ${r.mysqlCount}`);
      console.log(`   ${r.message}\n`);
    }

    // Summary
    const passed = results.filter(r => r.status === "pass").length;
    const total = results.length;
    console.log("=== Summary ===");
    console.log(`${passed}/${total} validations passed`);

    if (passed === total) {
      console.log("\n✅ All migrations validated successfully!");
    } else {
      console.log("\n⚠️ Some validations need attention. Review the results above.");
    }

  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

validateMigration().catch(console.error);
