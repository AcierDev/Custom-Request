"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Add logging to track the flow
    console.log("Home page loaded");
    console.log("Auth state:", { user, isLoading });

    // If auth is still loading, wait for it
    if (isLoading) return;

    // Only proceed if we haven't started redirecting yet
    if (shouldRedirect) return;

    setShouldRedirect(true);
    console.log("Determining redirect path");

    // Check if user is a guest
    const isGuest = localStorage.getItem("everwood_is_guest") === "true";
    console.log("Is guest user:", isGuest);

    // Handle routing logic
    if (user || isGuest) {
      console.log("User is authenticated or guest");
      // User is logged in or is a guest
      const onboardingCompleted = localStorage.getItem("onboardingCompleted");
      console.log("Onboarding completed:", onboardingCompleted);

      if (onboardingCompleted === "true") {
        // User has completed onboarding, send to design
        console.log("Redirecting to design");
        router.push("/design");
      } else {
        // To prevent circular redirect when coming back to home,
        // check if we're coming from sign-in
        const isRedirectingFromSignIn = sessionStorage.getItem(
          "redirectingFromSignIn"
        );

        if (isRedirectingFromSignIn === "true") {
          // If we're in a redirect loop, go straight to welcome
          console.log("Detected redirect loop, going to welcome");
          sessionStorage.removeItem("redirectingFromSignIn");
          sessionStorage.setItem("fromOnboarding", "true");
          // Clear any existing welcome_initial_render flag
          sessionStorage.removeItem("welcome_initial_render");
          console.log("Using window.location.replace for cleaner navigation");
          window.location.replace("/welcome");
        } else {
          // User has not completed onboarding, send to sign-in
          console.log("Redirecting to sign-in for onboarding");
          // Mark that we're redirecting to sign-in
          sessionStorage.setItem("redirectingFromSignIn", "true");
          router.push("/sign-in");
        }
      }
    } else {
      // Not logged in, redirect to sign-in
      console.log("No user, redirecting to sign-in");
      router.push("/sign-in");
    }
  }, [user, isLoading, router, shouldRedirect]);

  // Show nothing while we're determining where to redirect
  return null;
}
