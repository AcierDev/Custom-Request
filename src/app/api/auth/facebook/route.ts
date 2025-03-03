import { NextRequest, NextResponse } from "next/server";

// Facebook OAuth configuration
const FACEBOOK_CLIENT_ID = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
const FACEBOOK_REDIRECT_URI =
  process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI ||
  "http://localhost:3000/api/auth/facebook/callback";

export async function GET(request: NextRequest) {
  try {
    // Construct Facebook OAuth URL
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      FACEBOOK_REDIRECT_URI
    )}&scope=email,public_profile&response_type=code&state=${Math.random()
      .toString(36)
      .substring(7)}`;

    // Redirect to Facebook login
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Facebook auth error:", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=server_error", request.url)
    );
  }
}
