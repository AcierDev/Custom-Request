import { NextRequest, NextResponse } from "next/server";

// Facebook OAuth configuration
const FACEBOOK_CLIENT_ID = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || "";
const FACEBOOK_REDIRECT_URI =
  process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI ||
  "http://localhost:3000/api/auth/facebook/callback";

export async function GET(request: NextRequest) {
  try {
    // Get authorization code from URL
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Facebook auth error:", error);
      return NextResponse.redirect(
        new URL("/sign-in?error=facebook_auth_error", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/sign-in?error=no_code", request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://graph.facebook.com/v19.0/oauth/access_token",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        cache: "no-store",
      }
    );

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
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture&access_token=${tokens.access_token}`,
      {
        cache: "no-store",
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
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture?.data?.url,
      provider: "facebook",
    };

    // Create a temporary token (in a real app, use a proper JWT)
    const tempToken = Buffer.from(JSON.stringify(user)).toString("base64");

    // Redirect to a handler page that will store the user in localStorage
    return NextResponse.redirect(
      new URL(`/auth/facebook-handler?token=${tempToken}`, request.url)
    );
  } catch (error) {
    console.error("Facebook callback error:", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=server_error", request.url)
    );
  }
}
