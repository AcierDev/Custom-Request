import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/appPaths";

// Facebook OAuth configuration
const FACEBOOK_CLIENT_ID = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
const FACEBOOK_REDIRECT_URI =
  process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI || "";

export async function GET(request: NextRequest) {
  try {
    const redirectUri = FACEBOOK_REDIRECT_URI ||
      appUrl("/api/auth/facebook/callback", request.nextUrl.origin);
    // Construct Facebook OAuth URL
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=email,public_profile&response_type=code&state=${Math.random()
      .toString(36)
      .substring(7)}`;

    // Redirect to Facebook login
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Facebook auth error:", error);
    return NextResponse.redirect(
      appUrl("/sign-in?error=server_error", request.nextUrl.origin)
    );
  }
}
