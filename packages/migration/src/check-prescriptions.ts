import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Asclepius";

async function checkPrescriptions() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db();

    const collections = await db.listCollections().toArray();
    console.log("All collections:", collections.map(c => c.name).join(", "));

    const rxCount = await db.collection("prescriptions").countDocuments();
    console.log("\nPrescriptions count:", rxCount);

    if (rxCount > 0) {
      const prescriptions = await db.collection("prescriptions").find({}).toArray();
      console.log("\nSample prescriptions:");
      prescriptions.forEach((rx, i) => {
        console.log(`\n--- Prescription ${i + 1} ---`);
        console.log(JSON.stringify(rx, null, 2));
      });
    }
  } finally {
    await client.close();
  }
}

checkPrescriptions().catch(console.error);
