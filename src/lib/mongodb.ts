import { MongoClient, ServerApiVersion } from "mongodb";

// Connection URI
const uri = process.env.MONGODB_URI || "";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database Name
const dbName = process.env.MONGODB_DB || "everwood";

// Cache the database connection
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

export async function connectToDatabase() {
  // If we have a cached connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If no cached connection, create a new one
  if (!cachedClient) {
    cachedClient = await client.connect();
  }

  // Get the database
  cachedDb = cachedClient.db(dbName);

  return { client: cachedClient, db: cachedDb };
}

// Helper function to close the connection
export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}
