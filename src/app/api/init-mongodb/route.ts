import { initializeMongoDB } from "@/lib/initMongoDB";
import { testTokens } from "@/lib/tokenTest";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * API endpoint to initialize MongoDB and optionally run token tests
 *
 * Usage:
 * - GET /api/init-mongodb - Initialize MongoDB
 * - GET /api/init-mongodb?test=true - Initialize MongoDB and run token tests
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Initialize MongoDB
    await initializeMongoDB();

    // Check if we should run tests
    const runTests = req.query.test === "true";

    if (runTests) {
      // Run token tests
      await testTokens();
      return res.status(200).json({
        success: true,
        message: "MongoDB initialized and token tests completed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "MongoDB initialized successfully",
    });
  } catch (error) {
    console.error("Error in MongoDB initialization API:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to initialize MongoDB",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
