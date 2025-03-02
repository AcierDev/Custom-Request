"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function GoogleAuthHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      console.error("Authentication error:", error);
      router.push(`/sign-in?error=${error}`);
      return;
    }

    if (!token) {
      router.push("/sign-in?error=no_token");
      return;
    }

    try {
      // Decode the token
      const userData = JSON.parse(Buffer.from(token, "base64").toString());

      // Store user data in localStorage
      localStorage.setItem("everwood_user", JSON.stringify(userData));

      // Redirect to the app
      router.push("/order");
    } catch (error) {
      console.error("Error processing authentication:", error);
      router.push("/sign-in?error=processing");
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30 dark:from-gray-950 dark:to-gray-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">Completing Sign In</h1>
        <p className="text-muted-foreground">
          Please wait while we complete your authentication...
        </p>
      </div>
    </div>
  );
}
