/**
 * Test MongoDB Connection
 */

import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asclepius";

async function testConnection() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB successfully");

    const db = client.db();
    const collections = await db.listCollections().toArray();

    console.log("\nCollections found:");
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    console.log("\n✅ Connection test passed");
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();
