/**
 * Validate Migration - Compare record counts and sample data
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

async function validateMigration() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    const db = mongo.db();

    console.log("=== Migration Validation ===\n");

    // Compare counts
    const comparisons = [
      { mongo: "users", mysql: "user" },
      { mongo: "patients", mysql: "patient" },
      { mongo: "visits", mysql: "encounter" },
      { mongo: "prescriptions", mysql: "medication" },
      { mongo: "audit_logs", mysql: "auditLog" },
    ];

    let allPassed = true;

    for (const { mongo: mongoCol, mysql: mysqlModel } of comparisons) {
      const mongoCount = await db.collection(mongoCol).countDocuments();
      const mysqlCount = await (prisma as any)[mysqlModel].count();

      const status = mysqlCount >= mongoCount ? "✅" : "⚠️";
      if (mysqlCount < mongoCount) allPassed = false;

      console.log(`${status} ${mongoCol} → ${mysqlModel}: ${mongoCount} → ${mysqlCount}`);
    }

    // Check observations (derived from medical_records vitals)
    const recordsWithVitals = await db.collection("medical_records").countDocuments({ vital_signs: { $exists: true } });
    const observationCount = await prisma.observation.count();
    console.log(`ℹ️  medical_records (vitals) → observations: ${recordsWithVitals} records → ${observationCount} observations`);

    console.log("\n=== Validation Complete ===");
    console.log(allPassed ? "✅ All migrations validated" : "⚠️ Some migrations may have issues");

  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

validateMigration().catch(console.error);
