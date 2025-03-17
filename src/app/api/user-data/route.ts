import { NextRequest, NextResponse } from "next/server";
import { getUserData, saveUserData } from "@/lib/userDataService";

// GET handler to retrieve user data
export async function GET(request: NextRequest) {
  try {
    // Get the user ID from the URL
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const userData = await getUserData(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "User data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: userData });
  } catch (error) {
    console.error("API error getting user data:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}

// POST handler to save user data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, storeData, email } = body;

    if (!userId || !storeData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const docId = await saveUserData(userId, storeData, email);
    return NextResponse.json({ success: true, docId });
  } catch (error) {
    console.error("API error saving user data:", error);
    return NextResponse.json(
      { error: "Failed to save user data" },
      { status: 500 }
    );
  }
}
