import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { generateToken, generateMagicLink } from "@/lib/token";

// Email authentication endpoint
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate a secure token
    const token = await generateToken(email, "VERIFICATION", 1);

    // Generate the magic link
    const magicLink = generateMagicLink(token.id, email);

    // Send the email with the magic link
    const emailResult = await sendEmail({
      to: email,
      subject: "Sign in to Everwood",
      template: "magic-link",
      templateData: {
        link: magicLink,
        email,
      },
    });

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Magic link email sent successfully",
    });
  } catch (error) {
    console.error("Email auth error:", error);
    return NextResponse.json(
      { error: "Server error processing email authentication" },
      { status: 500 }
    );
  }
}
