import { NextRequest, NextResponse } from "next/server";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "";

export async function GET(request: NextRequest) {
  try {
    // Get authorization code from URL
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(
        new URL("/sign-in?error=no_code", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange error:", error);
      return NextResponse.redirect(
        new URL("/sign-in?error=token_exchange", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info with access token
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      const error = await userInfoResponse.text();
      console.error("User info error:", error);
      return NextResponse.redirect(
        new URL("/sign-in?error=user_info", request.url)
      );
    }

    const userInfo = await userInfoResponse.json();

    // Create user object
    const user = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
      provider: "google",
    };

    // Store user in a secure HTTP-only cookie or session
    // For this example, we'll redirect with a temporary token in the URL
    // In a real app, you would set a secure cookie or use a session store

    // Create a temporary token (in a real app, use a proper JWT)
    const tempToken = Buffer.from(JSON.stringify(user)).toString("base64");

    // Redirect to a handler page that will store the user in localStorage
    return NextResponse.redirect(
      new URL(`/auth/google-handler?token=${tempToken}`, request.url)
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=server_error", request.url)
    );
  }
}
