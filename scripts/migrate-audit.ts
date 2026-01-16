/**
 * Audit Log Migration - MongoDB to MySQL
 * Preserves audit trail for HIPAA compliance
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "PRINT";

function mapAuditAction(action: string): AuditAction {
  const actionMap: Record<string, AuditAction> = {
    create: "CREATE",
    read: "READ",
    update: "UPDATE",
    delete: "DELETE",
    login: "LOGIN",
    logout: "LOGOUT",
    export: "EXPORT",
    print: "PRINT",
    view: "READ",
    access: "READ",
    modify: "UPDATE",
  };
  return actionMap[action?.toLowerCase()] || "READ";
}

async function migrateAuditLogs() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();
    const logs = await db.collection("audit_logs").find({}).toArray();

    console.log(`Found ${logs.length} audit logs to migrate`);

    let migrated = 0;
    let errors = 0;

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
        migrated++;
      } catch (e: any) {
        console.error(`Error migrating audit log ${log._id}: ${e.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete: ${migrated} audit logs migrated, ${errors} errors`);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

migrateAuditLogs().catch(console.error);
