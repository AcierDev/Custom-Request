import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB = process.env.MONGODB_DB || "app";

// Connection options with proper pooling
const options = {
  maxPoolSize: 10, // Limit the number of connections in the pool
  minPoolSize: 1, // Minimum number of connections to maintain
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  connectTimeoutMS: 5000, // Timeout for initial connection
};

// Cache the MongoDB connection to prevent multiple connections
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<Db> | null = null;

/**
 * Connect to MongoDB and return the database instance
 */
export async function getMongoDb(): Promise<Db> {
  // If we have a cached connection, return it
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  // If a connection is in progress, return that promise
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create a new connection promise
  connectionPromise = (async () => {
    try {
      // Create a new connection
      const client = new MongoClient(MONGODB_URI, options);
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
    } catch (error) {
      console.error("MongoDB connection error:", error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

/**
 * Close the MongoDB connection
 */
export async function closeMongoDbConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    connectionPromise = null;
  }
}

// Helper function to get a collection
export async function getCollection(collectionName: string) {
  const db = await getMongoDb();
  return db.collection(collectionName);
}

// Register cleanup handler for serverless environments
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing MongoDB connection");
    await closeMongoDbConnection();
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, closing MongoDB connection");
    await closeMongoDbConnection();
  });
}
