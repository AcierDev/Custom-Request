import { getCollection } from "./mongodb";
import { ObjectId } from "mongodb";

// Define the user data structure
export interface UserData {
  userId: string;
  storeData: any; // This will store the serialized state from the custom store
  lastUpdated: Date;
}

// Collection name
const COLLECTION_NAME = "userData";

/**
 * Save user data to MongoDB
 * @param userId The user's ID
 * @param storeData The data to save
 * @returns The saved document ID
 */
export async function saveUserData(
  userId: string,
  storeData: any
): Promise<string> {
  try {
    const collection = await getCollection(COLLECTION_NAME);

    // Check if user data already exists
    const existingData = await collection.findOne({ userId });

    if (existingData) {
      // Update existing document
      await collection.updateOne(
        { userId },
        {
          $set: {
            storeData,
            lastUpdated: new Date(),
          },
        }
      );
      return existingData._id.toString();
    } else {
      // Create new document
      const result = await collection.insertOne({
        userId,
        storeData,
        lastUpdated: new Date(),
      });
      return result.insertedId.toString();
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    throw new Error("Failed to save user data");
  }
}

/**
 * Get user data from MongoDB
 * @param userId The user's ID
 * @returns The user's data or null if not found
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const collection = await getCollection(COLLECTION_NAME);
    const userData = await collection.findOne({ userId });
    return userData as UserData | null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw new Error("Failed to get user data");
  }
}

/**
 * Delete user data from MongoDB
 * @param userId The user's ID
 * @returns True if successful, false otherwise
 */
export async function deleteUserData(userId: string): Promise<boolean> {
  try {
    const collection = await getCollection(COLLECTION_NAME);
    const result = await collection.deleteOne({ userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw new Error("Failed to delete user data");
  }
}

/**
 * Create an API route handler for saving user data
 * This can be used in Next.js API routes
 */
export async function handleSaveUserData(req: any, res: any) {
  try {
    const { userId, storeData } = req.body;

    if (!userId || !storeData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const docId = await saveUserData(userId, storeData);
    return res.status(200).json({ success: true, docId });
  } catch (error) {
    console.error("API error saving user data:", error);
    return res.status(500).json({ error: "Failed to save user data" });
  }
}

/**
 * Create an API route handler for getting user data
 * This can be used in Next.js API routes
 */
export async function handleGetUserData(req: any, res: any) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }

    const userData = await getUserData(userId);

    if (!userData) {
      return res.status(404).json({ error: "User data not found" });
    }

    return res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("API error getting user data:", error);
    return res.status(500).json({ error: "Failed to get user data" });
  }
}
