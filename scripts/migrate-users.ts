/**
 * User Account Migration - MongoDB to MySQL
 * Migrates users from Asclepius to Xoai
 */

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";
const prisma = new PrismaClient();

type UserRole = "USER" | "ADMIN" | "DOCTOR" | "NURSE" | "PATIENT";

function mapUserRole(type: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    doctor: "DOCTOR",
    nurse: "NURSE",
    admin: "ADMIN",
    pharmacist: "USER",
    lab_tech: "USER",
    clerk: "USER",
  };
  return roleMap[type?.toLowerCase()] || "USER";
}

async function migrateUsers() {
  const mongo = new MongoClient(MONGO_URI);

  try {
    await mongo.connect();
    console.log("Connected to MongoDB");

    const db = mongo.db();
    const users = await db.collection("users").find({}).toArray();

    console.log(`Found ${users.length} users to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const email = user.user_email || `${user.user_username}@migrated.local`;
        const role = mapUserRole(user.user_type);

        await prisma.user.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: `${user.user_first_name || ""} ${user.user_last_name || ""}`.trim() || "Unknown",
            role,
            createdAt: user.created_at ? new Date(user.created_at) : new Date(),
            updatedAt: user.updated_at ? new Date(user.updated_at) : new Date(),
          },
        });
        migrated++;
      } catch (e: any) {
        console.error(`Error migrating user ${user._id}: ${e.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete: ${migrated} users migrated, ${errors} errors`);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

migrateUsers().catch(console.error);
