import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB = process.env.MONGODB_DB || "app";

// Cache the MongoDB connection to prevent multiple connections
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB and return the database instance
 */
export async function getMongoDb(): Promise<Db> {
  // If we have a cached connection, return it
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  // Create a new connection
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  // Create indexes for tokens collection
  const tokensCollection = db.collection("tokens");
  await tokensCollection.createIndexes([
    { key: { id: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // TTL index for automatic cleanup
    { key: { type: 1 } },
  ]);

  // Cache the connection
  cachedClient = client;
  cachedDb = db;

  return db;
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoDbConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  const db = await getMongoDb();
  return db.collection(collectionName);
}
