"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function EmailAuthComplete() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const completeAuth = async () => {
      try {
        // Get the user data from the URL
        const userParam = searchParams.get("user");

        if (!userParam) {
          setError("No user data found");
          return;
        }

        // Parse the user data
        const userData = JSON.parse(decodeURIComponent(userParam));

        if (!userData || !userData.email) {
          setError("Invalid user data");
          return;
        }

        // Store the user data in localStorage (in a real app, this would be a secure cookie or token)
        localStorage.setItem("everwood_user", JSON.stringify(userData));

        // Check if there's a redirect URL saved
        const redirectUrl = localStorage.getItem(
          "everwood_redirect_after_signin"
        );

        if (redirectUrl) {
          localStorage.removeItem("everwood_redirect_after_signin");
          router.push(redirectUrl);
        } else {
          // Default redirect to order page
          router.push("/sign-in?onboarding=true");
        }
      } catch (error) {
        console.error("Error completing email authentication:", error);
        setError("An error occurred while completing authentication");
      }
    };

    completeAuth();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-muted/50">
      <div className="w-full max-w-md text-center space-y-4 p-8 rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-lg">
        {error ? (
          <div className="text-destructive">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push("/sign-in")}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold">Completing Authentication</h2>
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">
              Please wait while we complete your sign in...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
