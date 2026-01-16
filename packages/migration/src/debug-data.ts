import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Asclepius";

async function debugData() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();

    console.log("=== MongoDB Data Debug ===\n");

    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      console.log(`\n--- ${col.name} ---`);
      const docs = await db.collection(col.name).find({}).limit(2).toArray();
      for (const doc of docs) {
        console.log(JSON.stringify(doc, null, 2));
      }
    }
  } finally {
    await client.close();
  }
}

debugData().catch(console.error);
