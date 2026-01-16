import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";

async function listDatabases() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases found:");
    for (const db of dbs.databases) {
      console.log(`  - ${db.name} (${db.sizeOnDisk} bytes)`);
      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();
      for (const col of collections) {
        const count = await database.collection(col.name).countDocuments();
        console.log(`      ${col.name}: ${count} docs`);
      }
    }
  } finally {
    await client.close();
  }
}

listDatabases().catch(console.error);
