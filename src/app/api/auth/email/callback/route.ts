import { NextRequest, NextResponse } from "next/server";
import { validateToken, invalidateToken } from "@/lib/token";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/appPaths";

export async function GET(request: NextRequest) {
  try {
    // Get the token from the URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(
        appUrl("/sign-in?error=no_token", request.nextUrl.origin)
      );
    }

    // Validate the token
    const tokenData = await validateToken(token, "VERIFICATION");

    if (!tokenData) {
      return NextResponse.redirect(
        appUrl("/sign-in?error=invalid_token", request.nextUrl.origin)
      );
    }

    // Magic links are single-use: consume the token now so the link can't
    // be replayed within its lifetime.
    await invalidateToken(token);

    // Create a user object to be stored in localStorage
    const userObject = {
      id: `user-${Math.random().toString(36).substring(2, 9)}`,
      email: tokenData.email,
      name: tokenData.email.split("@")[0], // Simple name extraction from email
      provider: "email",
    };

    // Send welcome email
    try {
      await sendEmail({
        to: tokenData.email,
        subject: "Welcome to Everwood",
        template: "welcome",
        templateData: {
          name: userObject.name,
        },
      });
    } catch (error) {
      console.error("Error sending welcome email:", error);
      // Continue with authentication even if welcome email fails
    }

    // Redirect to a special page that will handle setting up the user session
    return NextResponse.redirect(
      appUrl(
        `/auth/email/complete?user=${encodeURIComponent(
          JSON.stringify(userObject)
        )}`,
        request.nextUrl.origin
      )
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      appUrl("/sign-in?error=processing", request.nextUrl.origin)
    );
  }
}
